import socket
import threading
import time
import serial

PI_HOST = "0.0.0.0"      # listen on all interfaces
PI_PORT = 5000           # port laptop will connect to
SERIAL_PORT = "/dev/ttyACM0"   # change if needed
BAUDRATE = 115200

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

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
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