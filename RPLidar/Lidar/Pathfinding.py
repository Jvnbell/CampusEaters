import cv2
import numpy as np


def detect_sidewalk(frame):
    # Define a region of interest (ROI) (e.g., the bottom half of the image)
    # The sidewalk is typically in the lower portion of the camera's view
    height, width = frame.shape[:2]
    roi_vertices = [(0, height), (width, height), (width // 2, height // 2)]

    # Create a mask for the ROI
    mask = np.zeros_like(frame)
    cv2.fillPoly(mask, np.array([roi_vertices], dtype=np.int32), (255, 255, 255))
    masked_frame = cv2.bitwise_and(frame, mask)

    # Convert to grayscale and apply color/edge detection (e.g., thresholding for a light sidewalk)
    gray = cv2.cvtColor(masked_frame, cv2.COLOR_BGR2GRAY)
    # A simple threshold can work if the sidewalk is a consistent light color
    _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)

    # You could also use more advanced techniques like Canny edge detection
    # edges = cv2.Canny(gray, 50, 150)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter and draw contours on the original frame
    for contour in contours:
        if cv2.contourArea(contour) > 500:  # Filter based on area
            cv2.drawContours(frame, [contour], -1, (0, 255, 0), 2)  # Draw in green

    return frame


# Capture video from webcam
cap = cv2.VideoCapture(2)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    detected_frame = detect_sidewalk(frame)
    cv2.imshow('Sidewalk Detection', detected_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
