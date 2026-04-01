import socket
import threading
import struct
import cv2
import numpy as np

PI_IP = "10.42.0.1"
PI_PORT = 5000
CAMERA_PORT = 5001

running = True


def receive_camera_stream():
    """Connect to Pi camera stream and display frames."""
    global running
    
    try:
        cam_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        cam_socket.connect((PI_IP, CAMERA_PORT))
        print("[CAMERA] Connected to camera stream")
        
        while running:
            # Read frame size (4 bytes)
            size_data = b''
            while len(size_data) < 4:
                chunk = cam_socket.recv(4 - len(size_data))
                if not chunk:
                    raise ConnectionError("Lost connection")
                size_data += chunk
            
            frame_size = struct.unpack('>I', size_data)[0]
            
            # Read frame data
            frame_data = b''
            while len(frame_data) < frame_size:
                chunk = cam_socket.recv(min(4096, frame_size - len(frame_data)))
                if not chunk:
                    raise ConnectionError("Lost connection")
                frame_data += chunk
            
            # Decode and display
            frame = cv2.imdecode(np.frombuffer(frame_data, dtype=np.uint8), cv2.IMREAD_COLOR)
            if frame is not None:
                cv2.imshow("Pi Camera", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    running = False
                    break
                    
    except ConnectionRefusedError:
        print("[CAMERA] Could not connect - camera server not running?")
    except Exception as e:
        print(f"[CAMERA] Error: {e}")
    finally:
        cv2.destroyAllWindows()


def main():
    global running
    
    # Start camera display in background thread
    camera_thread = threading.Thread(target=receive_camera_stream, daemon=True)
    camera_thread.start()
    
    # Connect to motor control server
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((PI_IP, PI_PORT))

            print(s.recv(1024).decode())
            print(s.recv(1024).decode())
            print("\nCommands: f, b, s, fr, fl, br, bl, status, 0-255")
            print("Press 'q' in camera window or type 'quit' to exit\n")

            while running:
                cmd = input("Enter command: ").strip()
                if cmd.lower() in {"quit", "exit"}:
                    running = False
                    break

                s.sendall((cmd + "\n").encode("utf-8"))

                s.settimeout(0.3)
                try:
                    while True:
                        reply = s.recv(1024)
                        if not reply:
                            break
                        print(reply.decode(), end="")
                        if len(reply) < 1024:
                            break
                except socket.timeout:
                    pass
                    
    except ConnectionRefusedError:
        print("[ERROR] Could not connect to Pi motor server")
    
    running = False
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()