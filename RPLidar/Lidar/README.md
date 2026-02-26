# Camera + RPLidar Integration Script

This script simultaneously captures video from a USB camera and reads distance measurements from an RPLidar sensor, displaying both in real-time.

## Requirements

```bash
pip install opencv-python rplidar-roboticia
```

## Configuration

Edit these variables in `Cameratest.py`:

| Variable | Description | Example |
|----------|-------------|---------|
| `LIDAR_PORT` | COM port where RPLidar is connected | `'COM4'` |
| `CAMERA_INDEX` | Camera index (0 = default camera) | `0`, `1`, `2` |

### Finding Your COM Port (Windows)
1. Open **Device Manager**
2. Expand **Ports (COM & LPT)**
3. Look for "Silicon Labs CP210x" or "USB Serial Port"
4. Note the COM port number (e.g., COM3, COM4)

## Usage

```bash
python Cameratest.py
```

Press **'q'** to quit.

---

# How It Works

## RPLidar Overview

The RPLidar is a 360-degree laser scanner. It spins continuously and measures the distance to objects around it. For each rotation, it returns hundreds of measurement points, each containing:

| Field | Description | Range |
|-------|-------------|-------|
| `quality` | Signal strength (higher = more reliable) | 0-15 |
| `angle` | Direction of measurement in degrees | 0-360 |
| `distance` | Distance to object in millimeters | 0-12000+ |

### Example Raw Lidar Scan Data (One Full 360° Rotation)

```python
[
    (quality=15, angle=0.0,   distance=1500),   # Object 1.5m directly ahead
    (quality=14, angle=1.5,   distance=1520),   # Object 1.52m at 1.5 degrees
    (quality=15, angle=3.0,   distance=1510),   # ...and so on
    ...
    (quality=12, angle=90.0,  distance=800),    # Object 0.8m to the right
    ...
    (quality=15, angle=180.0, distance=3000),   # Object 3m behind
    ...
    (quality=15, angle=270.0, distance=500),    # Object 0.5m to the left
    ...
    (quality=14, angle=358.5, distance=1490),   # Almost back to 0 degrees
]
```

A typical scan contains **200-400 points** depending on the lidar model and speed.

### Special Case: Distance = 0

When `distance=0`, it means the laser didn't bounce back. This happens when:
- Nothing is in range (open space, pointing at sky)
- Surface absorbed the laser (black/dark objects)
- Surface is at too steep an angle (laser deflected away)

These are displayed as **gray X marks** at the edge of the radar circle.

---

## Threading Architecture

The code uses two parallel threads:

| Thread | Purpose | Speed |
|--------|---------|-------|
| **Main Thread** | Camera capture + display | 30-60 fps |
| **Background Thread** | Lidar data reading | 5-10 scans/sec |

### Why Use Threading?

- The lidar sends data at its own pace (5-10 scans per second)
- If we read lidar in the main loop, we'd have to wait for each scan, which would slow down the camera display
- By running in a separate thread, both can operate at their own speeds

### Thread-Safe Data Sharing

```python
lidar_data = []           # Shared data between threads
lidar_lock = threading.Lock()  # Mutex to prevent simultaneous access
lidar_running = True      # Flag to signal thread shutdown
```

The `lidar_lock` is a "mutex" (mutual exclusion lock) that prevents two threads from accessing `lidar_data` at the exact same time, which could cause data corruption. Think of it like a bathroom lock - only one thread can use it at a time.

---

## Lidar Thread Function

```python
def lidar_thread(port):
```

### Initialization

```python
lidar = RPLidar(port)  # Opens serial connection (typically 115200 baud)
```

### Device Information

`get_info()` returns device information:
```python
{'model': 24, 'firmware': (1, 29), 'hardware': 7, 'serialnumber': '...'}
```

`get_health()` returns device status:
- `('Good', 0)` = Everything is fine
- `('Warning', error_code)` = Minor issue
- `('Error', error_code)` = Problem with the lidar

### Scanning Loop

`iter_scans()` is a generator that yields complete 360° scans. Behind the scenes, the lidar:

1. Spins its motor (around 5-10 rotations per second)
2. Fires a laser beam and measures the reflection time
3. Converts reflection time to distance (speed of light calculation)
4. Sends this data over USB serial

### Data Processing

The list comprehension extracts just (angle, distance) pairs, discarding quality:

```python
# Input:  [(15, 0.5, 1523.5), (14, 1.2, 1518.0), ...]
# Output: [(0.5, 1523.5), (1.2, 1518.0), ...]
lidar_data = [(angle, distance) for quality, angle, distance in scan]
```

### Common Errors

- `"could not open port 'COM4'"` = Wrong port or lidar not connected
- `"RPLidarException"` = Communication error with the device

---

## Radar Visualization

```python
def draw_lidar_overlay(frame, data, max_distance=4000):
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `frame` | Camera image (numpy array of shape [height, width, 3]) |
| `data` | List of (angle, distance) tuples from the lidar |
| `max_distance` | Maximum distance to display in mm (default 4000mm = 4 meters) |

### Coordinate System

**Lidar angles (looking down from above):**
```
            0° (forward)
              |
              |
270° (left) --+-- 90° (right)
              |
              |
          180° (backward)
```

**Screen coordinates:**
- Origin (0,0) is TOP-LEFT of the screen
- X increases going RIGHT
- Y increases going DOWN (opposite of normal math!)

### Polar to Cartesian Conversion

We convert lidar's polar coordinates (angle, distance) to screen's cartesian coordinates (x, y):

```
x = center_x + distance * cos(angle)  → horizontal position
y = center_y - distance * sin(angle)  → vertical (negative because Y is flipped)
```

### Example Calculation

For a point at angle=45°, distance=2000mm:

| Step | Calculation | Result |
|------|-------------|--------|
| 1. Convert to radians | `45 * (π/180)` | 0.785 radians |
| 2. Calculate scale | `(2000 / 4000) * 100` | 50 pixels from center |
| 3. Calculate X | `520 + 50 * cos(0.785)` | 555 |
| 4. Calculate Y | `120 - 50 * sin(0.785)` | 85 |
| 5. Calculate color | `255 * (1 - 2000/4000)` | 127 (yellow-ish) |

### Color Coding

| Distance | Color | Meaning |
|----------|-------|---------|
| Close (→0) | Red (0, 0, 255) | Danger |
| Medium | Yellow | Caution |
| Far (→max) | Green (0, 255, 0) | Safe |
| No reading (0) | White X mark | Unknown/infinity |

### Drawing Functions

```python
# Filled circle (background)
cv2.circle(frame, (center_x, center_y), radius, (40, 40, 40), -1)

# Ring (border)
cv2.circle(frame, (center_x, center_y), radius, (100, 100, 100), 2)

# X mark for no-reading (white)
cv2.line(frame, (x - 3, y - 3), (x + 3, y + 3), (255, 255, 255), 1)
cv2.line(frame, (x + 3, y - 3), (x - 3, y + 3), (255, 255, 255), 1)

# Text overlay
cv2.putText(frame, "LIDAR", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
```

---

## Main Display Loop

### Camera Frame Reading

```python
ret, frame = cap.read()
```

Returns:
- `ret`: Boolean - True if frame was successfully read
- `frame`: The image as a numpy array
  - Shape: `(height, width, 3)` for color images
  - Channels are Blue, Green, Red (BGR format, not RGB!)
  - Example: 640x480 camera gives shape `(480, 640, 3)`
  - Each pixel value is 0-255

### Thread-Safe Data Access

```python
with lidar_lock:
    current_lidar_data = lidar_data.copy()
```

`.copy()` creates a snapshot of the data, so we're not holding the lock while we process (which would slow down the lidar thread).

### Nearest Distance Calculation

```python
# Filter out invalid readings (distance=0)
# Example: [(45, 1500), (90, 0), (135, 2000)] → [1500, 2000]
distances = [d for a, d in current_lidar_data if d > 0]
min_dist = min(distances)
```

### Key Press Detection

```python
if cv2.waitKey(1) & 0xFF == ord('q'):
    break
```

- `waitKey(1)` waits 1 millisecond for a key press
- Returns -1 if no key was pressed
- `& 0xFF` gets the last 8 bits (handles different platforms)
- `ord('q')` returns the ASCII code of 'q' (113)
- The 1ms wait also allows the window to update

---

## Cleanup

```python
lidar_running = False     # Signal lidar thread to stop
cap.release()             # Close camera connection
cv2.destroyAllWindows()   # Close all OpenCV windows
```

