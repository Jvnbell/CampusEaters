import CameraLidarOut as cl
from Lidar import LidarOut as li
import threading
import CameraLidarOut as cl
import cv2

lidar_thread_handle = threading.Thread(target=li.lidar_thread, args=(li.LIDAR_PORT,), daemon=True)
lidar_thread_handle.start()

while True:
        ret, frame = cl.cap.read()
        
        if not ret:
            print("Error: Could not read frame.")
            break
        
        # Get current lidar data (thread-safe)q
        with li.lidar_lock:
            current_lidar_data = li.lidar_data.copy()


        if current_lidar_data:
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
cl.cap.release()
cv2.destroyAllWindows()
print("Done!")