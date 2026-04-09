#include <Wire.h>
#include <MPU6050.h>

const int IN1 = 5;
const int IN2 = 6;
const int ENA = 4;  // RIGHT motor
const int IN3 = 8;
const int IN4 = 7;
const int ENB = 9;  // LEFT motor

int currentSpeedA = 0;
int currentSpeedB = 0;
int targetSpeedA = 0;
int targetSpeedB = 0;
int adjustedA = 0;
int adjustedB = 0;

bool forwardA = true;
bool forwardB = true;
bool pendingDirectionChange = false;
bool nextDirectionA, nextDirectionB;

String pendingAction = "";

const int rampDelay = 10;
const int FULL_SPEED = 200;

// ── Gyro ────────────────────────────────────────────────────
MPU6050 mpu;
int16_t gzOffset = 0;
unsigned long lastGyroTime = 0;
const float GYRO_KP = 2.0;        // tune this — start low
const int MAX_GYRO_CORRECTION = 40; // max PWM nudge per cycle

float heading = 0;
float targetHeading = 0;
unsigned long lastIntegrationTime = 0;
// ────────────────────────────────────────────────────────────

void calibrateGyro() {
  Serial.println("Calibrating gyro — keep bot still for 2 seconds...");
  long sum = 0;
  for (int i = 0; i < 200; i++) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    sum += gz;
    delay(10);
  }
  gzOffset = sum / 200;
  Serial.print("gZ offset: ");
  Serial.println(gzOffset);
  Serial.println("Calibration done.");
}

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);

  Serial.begin(115200);

  // Init gyro
  Wire.begin();
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("MPU6050 connected.");
    calibrateGyro();
  } else {
    Serial.println("MPU6050 not found — running without gyro correction.");
  }

  Serial.println("Motor Control Interface:");
  Serial.println("Direction Commands: f, b, s, fr, fl, br, bl");
  Serial.println("Speed Commands: 0-255");
  Serial.println("Other: ?, help, status, cal");
  lastIntegrationTime = millis();

  setDirection(true, true);
  stopMotors();
}

void loop() {
  // ─────────────────────────────────────────────
  // 1. Handle serial input (unchanged behavior)
  // ─────────────────────────────────────────────
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toLowerCase();

    if (input.length() > 0) {
      if (input == "status") printStatus();
      else if (input == "cal") calibrateGyro();
      else handleCommand(input);
    }
  }

  // ─────────────────────────────────────────────
  // 2. Update heading from gyro (continuous)
  // ─────────────────────────────────────────────
  unsigned long now = millis();
  float dt = (now - lastIntegrationTime) / 1000.0;
  lastIntegrationTime = now;

  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float gzCorrected = gz - gzOffset;

  // Convert to deg/sec (MPU6050 ≈ 131 LSB per deg/sec)
  float angularVelocity = gzCorrected / 131.0;

  // Integrate to get heading
  heading += angularVelocity * dt;

  // ─────────────────────────────────────────────
  // 3. Determine if we should apply correction
  // ─────────────────────────────────────────────
  bool movingStraight = (
    targetSpeedA > 0 &&
    targetSpeedB > 0 &&
    forwardA == forwardB
  );

  adjustedA = targetSpeedA;
  adjustedB = targetSpeedB;

  if (movingStraight) {
    // Heading error (this is the IMPORTANT part)
    float error = heading - targetHeading;

    int correction = constrain(
      (int)(GYRO_KP * error),
      -MAX_GYRO_CORRECTION,
       MAX_GYRO_CORRECTION
    );

    // Apply differential correction
    adjustedA = constrain(targetSpeedA - correction, 0, 255); // RIGHT motor
    adjustedB = constrain(targetSpeedB + correction, 0, 255); // LEFT motor

    // Debug output
    Serial.print("H:"); Serial.print(heading);
    Serial.print(" Err:"); Serial.print(error);
    Serial.print(" Corr:"); Serial.print(correction);
    Serial.print(" A(R):"); Serial.print(adjustedA);
    Serial.print(" B(L):"); Serial.println(adjustedB);
  }

  // ─────────────────────────────────────────────
  // 4. Ramp motors smoothly
  // ─────────────────────────────────────────────
  rampMotor(currentSpeedA, adjustedA, ENA);
  rampMotor(currentSpeedB, adjustedB, ENB);

  // ─────────────────────────────────────────────
  // 5. Handle safe direction switching
  // ─────────────────────────────────────────────
  if (pendingDirectionChange &&
      currentSpeedA == 0 &&
      currentSpeedB == 0) {

    setDirection(nextDirectionA, nextDirectionB);
    forwardA = nextDirectionA;
    forwardB = nextDirectionB;
    pendingDirectionChange = false;

    Serial.println("Direction switched safely.");

    if (pendingAction != "") {
      Serial.print("Resuming: ");
      Serial.println(pendingAction);
      handleCommand(pendingAction);
      pendingAction = "";
    }
  }

  delay(rampDelay);
}
void handleCommand(String input) {
  if (input == "?" || input == "help") {
    Serial.println("Direction Commands: f, b, s, fr, fl, br, bl");
    Serial.println("Speed Commands: 0-255");
  } else if (input == "fr") {
    safeMoveSharp(true, true, true, input);
  } else if (input == "fl") {
    safeMoveSharp(true, true, false, input);
  } else if (input == "br") {
    safeMoveSharp(false, false, true, input);
  } else if (input == "bl") {
    safeMoveSharp(false, false, false, input);
  } else if (input == "f") {
    safeSetStraight(true, input);
  } else if (input == "b") {
    safeSetStraight(false, input);
  } else if (input == "s") {
    targetSpeedA = 0;
    targetSpeedB = 0;
    Serial.println("Stopping motors...");
  } else if (isNumber(input)) {
    int val = constrain(input.toInt(), 0, 255);
    targetSpeedA = val;
    targetSpeedB = val;
    Serial.print("Target speed set to: ");
    Serial.println(val);
  } else {
    Serial.print("Unknown command: ");
    Serial.println(input);
  }
}

void rampMotor(int &currentSpeed, int targetSpeed, int pwmPin) {
  if (currentSpeed < targetSpeed) currentSpeed++;
  else if (currentSpeed > targetSpeed) currentSpeed--;
  analogWrite(pwmPin, currentSpeed);
}

void safeSetStraight(bool fwd, String command) {
  heading = 0;
  targetHeading = 0;
  lastIntegrationTime = millis();
  if ((forwardA != fwd) || (forwardB != fwd)) {
    pendingDirectionChange = true;
    nextDirectionA = fwd;
    nextDirectionB = fwd;
    pendingAction = command;
    targetSpeedA = 0;
    targetSpeedB = 0;
    Serial.println("Safe reversal: slowing to 0 before switching direction...");
  } else {
    targetSpeedA = FULL_SPEED;
    targetSpeedB = FULL_SPEED;
    setDirection(fwd, fwd);
    Serial.print("Moving straight: ");
    Serial.println(fwd ? "Forward" : "Backward");
  }
}

void safeMoveSharp(bool fwdA, bool fwdB, bool stopLeft, String command) {
  bool dirChange = (forwardA != fwdA) || (forwardB != fwdB);
  if (dirChange) {
    pendingDirectionChange = true;
    nextDirectionA = fwdA;
    nextDirectionB = fwdB;
    pendingAction = command;
    targetSpeedA = 0;
    targetSpeedB = 0;
    Serial.println("Safe reversal: slowing to 0 before switching direction...");
  } else {
    setDirection(fwdA, fwdB);
    if (stopLeft) {
      targetSpeedA = 0;
      targetSpeedB = FULL_SPEED;
    } else {
      targetSpeedA = FULL_SPEED;
      targetSpeedB = 0;
    }
  }
}

void setDirection(bool fwdA, bool fwdB) {
  if (fwdA) { digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH); }
  else       { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);  }

  if (fwdB) { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);  }
  else       { digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH); }
}

void stopMotors() {
  targetSpeedA = 0;
  targetSpeedB = 0;
  adjustedA = 0;
  adjustedB = 0;
}

bool isNumber(String str) {
  if (str.length() == 0) return false;
  for (unsigned int i = 0; i < str.length(); i++)
    if (!isDigit(str.charAt(i))) return false;
  return true;
}

void printStatus() {
  Serial.println("=== MOTOR STATUS ===");
  Serial.print("Right motor (A): ");
  if (currentSpeedA == 0) Serial.print("Stopped");
  else Serial.print(forwardA ? "Forward" : "Backward");
  Serial.print(" | Speed: "); Serial.println(currentSpeedA);

  Serial.print("Left motor (B): ");
  if (currentSpeedB == 0) Serial.print("Stopped");
  else Serial.print(forwardB ? "Forward" : "Backward");
  Serial.print(" | Speed: "); Serial.println(currentSpeedB);

  Serial.print("Gyro offset: "); Serial.println(gzOffset);

  if (pendingDirectionChange)
    Serial.println("Pending direction change in progress...");
  Serial.println("====================");
}