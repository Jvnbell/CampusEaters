import socket
import threading
import time
import serial
import struct
import io

PI_HOST = "0.0.0.0"      # listen on all interfaces
PI_PORT = 5000           # port laptop will connect to
CAMERA_PORT = 5001       # port for camera streaming
SERIAL_PORT = "/dev/ttyACM0"   # change if needed
BAUDRATE = 115200

# Camera setup - will be initialized on Pi
camera = None
camera_lock = threading.Lock()

VALID_COMMANDS = {"f", "b", "s", "fr", "fl", "br", "bl", "status", "help", "?"}


class ArduinoBridge:
    def __init__(self, port, baudrate):
        self.lock = threading.Lock()
        self.ser = serial.Serial(port, baudrate, timeout=1)
        time.sleep(2)  # let Arduino reset after serial connection opens

        # flush startup text
        self._drain_serial()

    def _drain_serial(self, timeout=0.5):
        """Read all available lines from serial with proper timeout handling."""
        lines = []
        deadline = time.time() + timeout
        
        while time.time() < deadline:
            if self.ser.in_waiting:
                line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    lines.append(line)
                    # Reset deadline when we get data - more might be coming
                    deadline = time.time() + 0.1
            else:
                time.sleep(0.02)  # Small sleep to avoid busy waiting
        
        return lines

    def send_command(self, command):
        with self.lock:
            # Clear any stale data in the buffer first
            while self.ser.in_waiting:
                self.ser.read(self.ser.in_waiting)
            
            self.ser.write((command + "\n").encode("utf-8"))
            self.ser.flush()
            
            # Give Arduino time to process - longer for status command
            if command == "status":
                return self._drain_serial(timeout=0.8)
            else:
                return self._drain_serial(timeout=0.4)

    def close(self):
        if self.ser.is_open:
            self.ser.close()


def init_camera():
    """Initialize the Pi camera. Returns None if not available."""
    global camera
    try:
        from picamera2 import Picamera2
        camera = Picamera2()
        config = camera.create_preview_configuration(main={"size": (640, 480), "format": "RGB888"})
        camera.configure(config)
        camera.start()
        time.sleep(1)  # Let camera warm up
        print("[CAMERA] Picamera2 initialized successfully")
        return camera
    except ImportError:
        print("[CAMERA] picamera2 not available, trying picamera...")
        try:
            import picamera
            camera = picamera.PiCamera()
            camera.resolution = (640, 480)
            camera.framerate = 24
            time.sleep(1)
            print("[CAMERA] PiCamera initialized successfully")
            return camera
        except ImportError:
            print("[CAMERA] No camera library available")
            return None
    except Exception as e:
        print(f"[CAMERA] Failed to initialize: {e}")
        return None


def capture_frame_jpeg():
    """Capture a single JPEG frame from the camera."""
    global camera
    if camera is None:
        return None
    
    with camera_lock:
        try:
            # For picamera2
            if hasattr(camera, 'capture_array'):
                import cv2
                frame = camera.capture_array()
                _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                return jpeg.tobytes()
            # For legacy picamera
            else:
                stream = io.BytesIO()
                camera.capture(stream, format='jpeg', use_video_port=True)
                stream.seek(0)
                return stream.read()
        except Exception as e:
            print(f"[CAMERA] Capture error: {e}")
            return None


def handle_camera_client(conn, addr):
    """Stream camera frames to a connected client."""
    print(f"[CAMERA] Client {addr} connected for video stream")
    
    try:
        while True:
            frame_data = capture_frame_jpeg()
            if frame_data is None:
                time.sleep(0.1)
                continue
            
            # Send frame size (4 bytes) followed by frame data
            size = len(frame_data)
            conn.sendall(struct.pack('>I', size) + frame_data)
            time.sleep(0.033)  # ~30 fps
            
    except (BrokenPipeError, ConnectionResetError):
        pass
    except Exception as e:
        print(f"[CAMERA] Stream error: {e}")
    finally:
        conn.close()
        print(f"[CAMERA] Client {addr} disconnected")


def start_camera_server():
    """Start the camera streaming server on a separate port."""
    init_camera()
    
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((PI_HOST, CAMERA_PORT))
    server.listen(2)
    
    print(f"[CAMERA] Streaming server listening on {PI_HOST}:{CAMERA_PORT}")
    
    while True:
        try:
            conn, addr = server.accept()
            thread = threading.Thread(target=handle_camera_client, args=(conn, addr), daemon=True)
            thread.start()
        except Exception as e:
            print(f"[CAMERA] Server error: {e}")
            break


def is_valid_command(cmd):
    if cmd in VALID_COMMANDS:
        return True
    if cmd.isdigit():
        value = int(cmd)
        return 0 <= value <= 255
    return False


def handle_client(conn, addr, bridge):
    print(f"[NEW CONNECTION] {addr} connected.")
    conn.sendall(b"Connected to Pi motor bridge.\n")
    conn.sendall(b"Send commands: f, b, s, fr, fl, br, bl, status, help, or 0-255\n")

    try:
        buffer = ""
        while True:
            data = conn.recv(1024)
            if not data:
                break

            buffer += data.decode("utf-8", errors="ignore")

            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                cmd = line.strip().lower()

                if not cmd:
                    continue

                print(f"[{addr}] Command: {cmd}")

                if not is_valid_command(cmd):
                    conn.sendall(f"ERROR: invalid command '{cmd}'\n".encode("utf-8"))
                    continue

                try:
                    print(f"[{addr}] Sending to Arduino: '{cmd}'")
                    replies = bridge.send_command(cmd)
                    print(f"[{addr}] Arduino replied: {replies}")

                    if replies:
                        for reply in replies:
                            conn.sendall((reply + "\n").encode("utf-8"))
                    else:
                        conn.sendall(b"OK (no response from Arduino)\n")

                except Exception as e:
                    conn.sendall(f"ERROR forwarding to Arduino: {e}\n".encode("utf-8"))

    except Exception as e:
        print(f"[ERROR] Client {addr}: {e}")

    finally:
        conn.close()
        print(f"[DISCONNECTED] {addr} disconnected.")


def start_server():
    bridge = ArduinoBridge(SERIAL_PORT, BAUDRATE)

    # Start camera server in background thread
    camera_thread = threading.Thread(target=start_camera_server, daemon=True)
    camera_thread.start()

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((PI_HOST, PI_PORT))
    server.listen(5)

    print(f"[LISTENING] Pi server listening on {PI_HOST}:{PI_PORT}")

    try:
        while True:
            conn, addr = server.accept()
            thread = threading.Thread(target=handle_client, args=(conn, addr, bridge), daemon=True)
            thread.start()

    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Server stopping.")

    finally:
        bridge.close()
        server.close()


if __name__ == "__main__":
    start_server()