from flask import Flask, render_template, jsonify, request
import serial
import serial.tools.list_ports
import threading
import time

app = Flask(__name__)

BAUD_RATE = 115200

arduino = None
arduino_lock = threading.Lock()
last_status = {"connected": False, "last_response": "", "port": ""}


def find_arduino():
    """Find Arduino by scanning available serial ports."""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        # Arduino Mega vendor IDs: official (0x2341), CH340 clone (0x1A86), FTDI (0x0403)
        if port.vid in [0x2341, 0x1A86, 0x0403]:
            print(f"Found Arduino at {port.device} ({port.description})")
            return port.device
        # Fallback: look for ACM ports or Arduino in description
        if 'ACM' in port.device or 'Arduino' in (port.description or ''):
            print(f"Found Arduino at {port.device} ({port.description})")
            return port.device
    return None


def connect_arduino():
    global arduino
    while True:
        try:
            if arduino is None or not arduino.is_open:
                port = find_arduino()
                if port:
                    arduino = serial.Serial(port, BAUD_RATE, timeout=1)
                    last_status["connected"] = True
                    last_status["port"] = port
                    print(f"Connected to Arduino on {port}")
                    time.sleep(2)  # wait for Arduino to boot
                else:
                    last_status["connected"] = False
                    last_status["port"] = ""
                    print("No Arduino found, retrying in 3s...")
        except Exception as e:
            last_status["connected"] = False
            last_status["port"] = ""
            print(f"Arduino connection failed: {e}")
            arduino = None
        time.sleep(3)


def send_command(cmd):
    global arduino
    with arduino_lock:
        try:
            if arduino and arduino.is_open:
                arduino.write((cmd + '\n').encode())
                time.sleep(0.05)
                response = ""
                while arduino.in_waiting:
                    response += arduino.readline().decode('utf-8', errors='ignore')
                last_status["last_response"] = response.strip()
                return True
            else:
                last_status["connected"] = False
        except Exception as e:
            last_status["connected"] = False
            print(f"Send error: {e}")
            arduino = None
    return False


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/cmd/<command>', methods=['POST'])
def command(command):
    allowed = ['f', 'b', 's', 'fr', 'fl', 'br', 'bl', 'status']
    if command in allowed:
        ok = send_command(command)
        return jsonify({"ok": ok, "response": last_status["last_response"]})
    return jsonify({"ok": False, "error": "unknown command"}), 400


@app.route('/speed', methods=['POST'])
def speed():
    val = request.json.get('value', 0)
    val = max(0, min(255, int(val)))
    ok = send_command(str(val))
    return jsonify({"ok": ok, "speed": val})


@app.route('/status')
def status():
    send_command('status')
    return jsonify(last_status)


if __name__ == '__main__':
    # Start Arduino connection in background thread
    t = threading.Thread(target=connect_arduino, daemon=True)
    t.start()
    print("CampusEats server starting on http://10.42.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
