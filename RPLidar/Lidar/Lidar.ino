#include <RPLidar.h>

//////////////// CONFIG ////////////////
#define RPLIDAR_SERIAL Serial1   // change to Serial if you only have one
#define RPLIDAR_MOTOR_PIN 3      // set to your motor ctrl pin, or remove if not used
const unsigned long PRINT_INTERVAL_MS = 8000;
const int MAX_POINTS = 360;      // simple buffer
///////////////////////////////////////

RPLidar lidar;

struct Point {
  float angleDeg;
  float distanceMM;
};
Point points[MAX_POINTS];
int pointCount = 0;

unsigned long lastPrint = 0;

void setup() {
  Serial.begin(115200);          // for debug output to PC
  delay(2000);

  // start lidar serial
  RPLIDAR_SERIAL.begin(115200);  // A1/A2 default baud

  // bind lidar to that serial
  lidar.begin(RPLIDAR_SERIAL);

  // start motor (if your module needs it)
  pinMode(RPLIDAR_MOTOR_PIN, OUTPUT);
  digitalWrite(RPLIDAR_MOTOR_PIN, HIGH);

  Serial.println("Starting RPLIDAR...");

  // try to start scan
  if (IS_OK(lidar.startScan())) {
    Serial.println("Lidar scan started.");
  } else {
    Serial.println("Failed to start scan.");
  }
}

void loop() {
  // this must be called often
  if (IS_OK(lidar.waitPoint())) {
    float distance = lidar.getCurrentPoint().distance; // in mm
    float angle    = lidar.getCurrentPoint().angle;    // in degrees
    bool  startBit = lidar.getCurrentPoint().startBit; // true when a new scan starts

    // if new scan starts, you COULD reset buffer here
    if (startBit) {
      // optional: pointCount = 0;
    }

    // store point if valid
    if (distance > 0 && pointCount < MAX_POINTS) {
      points[pointCount].angleDeg = angle;
      points[pointCount].distanceMM = distance;
      pointCount++;
    }
  }

  // every 8 seconds, print what we have
  unsigned long now = millis();
  if (now - lastPrint >= PRINT_INTERVAL_MS) {
    Serial.println();
    Serial.println(F("---- LIDAR POINTS ----"));
    for (int i = 0; i < pointCount; i++) {
      Serial.print("angle=");
      Serial.print(points[i].angleDeg, 2);
      Serial.print(" deg  distance=");
      Serial.print(points[i].distanceMM, 0);
      Serial.println(" mm");
    }
    Serial.print(F("Total points: "));
    Serial.println(pointCount);

    // reset buffer for next 8-second window
    pointCount = 0;
    lastPrint = now;
  }
}
