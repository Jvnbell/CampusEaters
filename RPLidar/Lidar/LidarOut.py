from rplidar import RPLidar
import threading

LIDAR_PORT = 'COM4'

lidar_data = []
lidar_lock = threading.Lock()
lidar_running = True

#Lidar scan thread seperate from main thread to avoid blocking the camera feed
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

