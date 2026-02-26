import cv2
import numpy as np
from rplidar import RPLidar
import threading
import math
import time
from Lidar import LidarOut as li

CAMERA_INDEX = 0

print("Starting Camera")
print("Press 'q' to quit")
print("-" * 40)


cap = cv2.VideoCapture(CAMERA_INDEX)

if not cap.isOpened():
    print("Error: Could not open camera.")
    lidar_running = False
    exit()

print("Camera opened successfully!")

last_print_time = time.time()
