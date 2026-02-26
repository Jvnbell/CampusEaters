import cv2
import numpy as np
from rplidar import RPLidar
import threading
import math
import time

LIDAR_PORT = 'COM4'
CAMERA_INDEX = 0

lidar_data = []
lidar_lock = threading.Lock()
lidar_running = True


def lidar_thread(port):
    global lidar_data, lidar_running
    
    lidar = None
    try:
        lidar = RPLidar(port)
        print(f"RPLidar connected on {port}")
        
        lidar.stop()
        lidar._serial.reset_input_buffer()
        
        print(f"RPLidar Info: {lidar.get_info()}")
        print(f"RPLidar Health: {lidar.get_health()}")
        
        current_scan = []
        for new_scan, quality, angle, distance in lidar.iter_measures():
            if not lidar_running:
                break
            
            if new_scan and current_scan:
                with lidar_lock:
                    lidar_data = current_scan.copy()
                current_scan = []
            
            current_scan.append((angle, distance))
        
    except Exception as e:
        print(f"Lidar Error: {e}")
        print("Make sure the RPLidar is connected and the correct COM port is set.")
    
    finally:
        if lidar:
            lidar.stop()
            lidar.disconnect()
            print("RPLidar disconnected.")


def draw_lidar_overlay(frame, data, max_distance=4000):
    h, w = frame.shape[:2]
    center_x, center_y = w - 120, 120
    radius = 100
    
    cv2.circle(frame, (center_x, center_y), radius, (40, 40, 40), -1)
    cv2.circle(frame, (center_x, center_y), radius, (100, 100, 100), 2)
    cv2.circle(frame, (center_x, center_y), radius // 2, (70, 70, 70), 1)
    
    for angle, distance in data:
        rad = math.radians(angle)
        
        if distance == 0:
            x = int(center_x + radius * math.cos(rad))
            y = int(center_y - radius * math.sin(rad))
            
            x_size = 3
            cv2.line(frame, (x - x_size, y - x_size), (x + x_size, y + x_size), 
                     (255, 255, 255), 1)
            cv2.line(frame, (x + x_size, y - x_size), (x - x_size, y + x_size), 
                     (255, 255, 255), 1)
        
        elif distance < max_distance:
            scale = (distance / max_distance) * radius
            x = int(center_x + scale * math.cos(rad))
            y = int(center_y - scale * math.sin(rad))
            
            color_intensity = int(255 * (1 - distance / max_distance))
            color = (0, 255 - color_intensity, color_intensity)
            cv2.circle(frame, (x, y), 2, color, -1)
    
    cv2.circle(frame, (center_x, center_y), 3, (255, 255, 255), -1)
    cv2.putText(frame, "LIDAR", (center_x - 25, center_y + radius + 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return frame

DANGER_ZONE = 500      # mm - RED border
CAUTION_ZONE = 1000    # mm - YELLOW border
BORDER_THICKNESS = 15  # pixels

def get_danger_color(distance):
    """Return BGR color based on distance."""
    if distance == 0:
        return (50, 50, 50)  # Gray for no reading
    elif distance < DANGER_ZONE:
        return (0, 0, 255)  # RED
    elif distance < CAUTION_ZONE:
        return (0, 200, 255)  # YELLOW
    else:
        return (0, 255, 0)  # GREEN

def draw_danger_border(frame, lidar_data):
    """
    Draw colored edges around the frame based on lidar readings.
    Each part of the edge corresponds to an angle from the lidar.
    
    Angle mapping (looking down from above, camera facing forward):
        - 0° (front) → TOP edge
        - 90° (right) → RIGHT edge
        - 180° (back) → BOTTOM edge
        - 270° (left) → LEFT edge
    """
    h, w = frame.shape[:2]
    t = BORDER_THICKNESS
    
    for angle, distance in lidar_data:
        color = get_danger_color(distance)
        
        # Normalize angle to 0-360
        angle = angle % 360
        
        if 315 <= angle or angle < 45:
            # FRONT (top edge): 315° to 45° maps to top edge
            # Map angle to x position on top edge
            if angle >= 315:
                progress = (angle - 315) / 90  # 315->360 = 0->0.5
            else:
                progress = (angle + 45) / 90   # 0->45 = 0.5->1
            x = int(progress * w)
            cv2.line(frame, (x, 0), (x, t), color, 2)
            
        elif 45 <= angle < 135:
            # RIGHT edge: 45° to 135°
            progress = (angle - 45) / 90
            y = int(progress * h)
            cv2.line(frame, (w - t, y), (w, y), color, 2)
            
        elif 135 <= angle < 225:
            # BACK (bottom edge): 135° to 225°
            progress = (angle - 135) / 90
            x = int((1 - progress) * w)  # Reversed so 180° is center
            cv2.line(frame, (x, h - t), (x, h), color, 2)
            
        elif 225 <= angle < 315:
            # LEFT edge: 225° to 315°
            progress = (angle - 225) / 90
            y = int((1 - progress) * h)  # Reversed
            cv2.line(frame, (0, y), (t, y), color, 2)
    
    return frame


print("Starting Camera + RPLidar system...")
print("Press 'q' to quit")
print("-" * 40)

lidar_thread_handle = threading.Thread(target=lidar_thread, args=(LIDAR_PORT,), daemon=True)
lidar_thread_handle.start()

cap = cv2.VideoCapture(CAMERA_INDEX)

if not cap.isOpened():
    print("Error: Could not open camera.")
    lidar_running = False
    exit()

print("Camera opened successfully!")

last_print_time = time.time()

while True:
    ret, frame = cap.read()
    
    if not ret:
        print("Error: Could not read frame.")
        break
    
    # Get current lidar data (thread-safe)
    with lidar_lock:
        current_lidar_data = lidar_data.copy()

    if current_lidar_data:
        # Draw danger border based on all lidar angles
        frame = draw_danger_border(frame, current_lidar_data)
        
        # Draw the radar overlay
        frame = draw_lidar_overlay(frame, current_lidar_data)

        # Keep only valid points for stats
        valid_points = [(a, d) for (a, d) in current_lidar_data if d > 0]

        if valid_points:
            # Nearest object (smallest distance)
            nearest_angle, nearest_dist = min(valid_points, key=lambda x: x[1])

            # Optional: adjust so "front" of the unit is at 0°
            ANGLE_OFFSET = 0.0  # change if your physical zero is different
            display_angle = (nearest_angle - ANGLE_OFFSET) % 360
            
            # Text for distance and angle
            cv2.putText(frame, f"Nearest: {nearest_dist:.0f} mm", (30, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Angle: {display_angle:.0f} deg", (30, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    else:
        cv2.putText(frame, "Waiting for LIDAR...", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    
    cv2.imshow('USB Camera + RPLidar Feed', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

print("\nShutting down...")
lidar_running = False
cap.release()
cv2.destroyAllWindows()
print("Done!")
