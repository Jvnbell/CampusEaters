import serial
import time

port = "/dev/ttyACM0"
baud = 115200

print(f"opening {port} at {baud} ...")
ser = serial.Serial(port, baud, timeout=1)
time.sleep(2)

print("Reading startup output...")
start = time.time()
while time.time() - start < 2:  
    if ser.in_waiting:
        line =ser.readline().decode("utf-8", errors = "ignore").strip()
        if line:
            print("ARDUINO:", line)
print("Sending status...")
ser.write(b"status\n")
ser.flush()

time.sleep(1)

got_any = False
while ser.in_waiting:
    got_any = True
    line = ser.readline().decode("utf-8", errors="ignore").strip()
    if line:
        print("ARDUINO: ", line)
        
if not got_any:
    print("No response")
ser.close()
