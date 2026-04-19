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

// ── Encoder (right wheel only) ───────────────────────────────
volatile long right_count = 0;
volatile unsigned long lastRightTime = 0;
volatile unsigned long rightInterval = 0;

const int MAGNETS = 8;
const float WHEEL_CIRCUMFERENCE_M = 0.471; 
const float METERS_PER_PULSE = WHEEL_CIRCUMFERENCE_M / MAGNETS;

unsigned long lastDebugTime = 0;
// ─────────────────────────────────────────────────────────────

// ── Gyro ─────────────────────────────────────────────────────
MPU6050 mpu;
int16_t gzOffset = 0;
const float GYRO_KP = 2.0;
const int MAX_GYRO_CORRECTION = 40;
float heading = 0;
float targetHeading = 0;
unsigned long lastIntegrationTime = 0;
// ─────────────────────────────────────────────────────────────

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

void resetHeading() {
  heading = 0;
  targetHeading = 0;
  lastIntegrationTime = millis();
}

void resetEncoder() {
  noInterrupts();
  right_count = 0;
  rightInterval = 0;
  interrupts();
}

// ── Gyro update — call every loop iteration ──────────────────
void updateGyro() {
  unsigned long now = millis();
  float dt = (now - lastIntegrationTime) / 1000.0;
  lastIntegrationTime = now;

  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float gzCorrected = gz - gzOffset;
  heading += (gzCorrected / 131.0) * dt;
}

// ── Gyro-based turn ───────────────────────────────────────────
void executeTurn(float targetAngle) {
  // Reset heading so we measure from zero
  resetHeading();

  Serial.print("Turning ");
  Serial.print(targetAngle);
  Serial.println(" degrees...");

  bool turnRight = (targetAngle > 0);

  // Set one wheel spinning, one stopped
  setDirection(true, true);
  if (turnRight) {
    targetSpeedA = 0;           // right stops
    targetSpeedB = FULL_SPEED;  // left drives
  } else {
    targetSpeedA = FULL_SPEED;  // right drives
    targetSpeedB = 0;           // left stops
  }

  unsigned long startTime = millis();
  const unsigned long TURN_TIMEOUT = 6000; // 6 second safety timeout

  while (millis() - startTime < TURN_TIMEOUT) {
    // Update heading
    updateGyro();

    // Ramp motors
    rampMotor(currentSpeedA, targetSpeedA, ENA);
    rampMotor(currentSpeedB, targetSpeedB, ENB);

    // Check for serial stop command during turn
    if (Serial.available() > 0) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      input.toLowerCase();
      if (input == "s") {
        targetSpeedA = 0;
        targetSpeedB = 0;
        Serial.println("Turn aborted by stop command.");
        break;
      }
    }

    // Slow down as we approach target for accuracy
    float remaining = abs(targetAngle) - abs(heading);
    if (remaining < 20.0) {
      // Reduce to half speed for final approach
      if (turnRight) {
        targetSpeedB = FULL_SPEED / 2;
      } else {
        targetSpeedA = FULL_SPEED / 2;
      }
    }

    // Check if reached target (95% threshold to account for overshoot)
    if (abs(heading) >= abs(targetAngle) * 0.95) {
      break;
    }

    delay(rampDelay);
  }

  // Ramp both motors down to zero
  targetSpeedA = 0;
  targetSpeedB = 0;
  while (currentSpeedA > 0 || currentSpeedB > 0) {
    rampMotor(currentSpeedA, 0, ENA);
    rampMotor(currentSpeedB, 0, ENB);
    delay(rampDelay);
  }

  Serial.print("TURN_DONE:");
  Serial.println(heading);

  resetHeading();
}

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);

  // Right encoder on pin 3
  pinMode(3, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(3), rightPulse, FALLING);

  Serial.begin(115200);

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
  Serial.println("Other: ?, help, status, cal, dist, rst");
  Serial.println("Turn: turn <degrees>  e.g. 'turn 90' or 'turn -45'");

  resetHeading();
  resetEncoder();
  setDirection(true, true);
  stopMotors();
}

void loop() {
  // 1. Handle serial input
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toLowerCase();
    if (input.length() > 0) {
      if (input == "status")       printStatus();
      else if (input == "cal")     calibrateGyro();
      else if (input == "dist")    printDistance();
      else if (input == "rst")     { resetEncoder(); Serial.println("Encoder reset."); }
      else if (input.startsWith("turn")) {
        float angle = input.substring(4).toFloat();
        if (angle != 0) executeTurn(angle);
        else Serial.println("Usage: turn <degrees>");
      }
      else handleCommand(input);
    }
  }

  // 2. Integrate gyro
  updateGyro();

  // 3. Compute corrections when driving straight
  bool movingStraight = (targetSpeedA > 0 && targetSpeedB > 0 && forwardA == forwardB);

  adjustedA = targetSpeedA;
  adjustedB = targetSpeedB;

  if (movingStraight) {
    float error = heading - targetHeading;
    if (abs(error) < 1.5) error = 0;  // deadband

    int correction = constrain(
      (int)(GYRO_KP * error),
      -MAX_GYRO_CORRECTION,
       MAX_GYRO_CORRECTION
    );

    adjustedA = constrain(targetSpeedA - correction, 0, 255);  // right
    adjustedB = constrain(targetSpeedB + correction, 0, 255);  // left

    // Debug every 200ms
    if (millis() - lastDebugTime >= 200) {
      lastDebugTime = millis();
      Serial.print("H:"); Serial.print(heading, 1);
      Serial.print(" Err:"); Serial.print(error, 1);
      Serial.print(" Corr:"); Serial.print(correction);
      Serial.print(" A(R):"); Serial.print(adjustedA);
      Serial.print(" B(L):"); Serial.print(adjustedB);
      Serial.print(" RPulses:"); Serial.println(right_count);
    }
  } else {
    if (targetSpeedA == 0 && targetSpeedB == 0) {
      resetHeading();
    }
  }

  // 4. Ramp motors
  rampMotor(currentSpeedA, adjustedA, ENA);
  rampMotor(currentSpeedB, adjustedB, ENB);

  // 5. Safe direction change
  if (pendingDirectionChange && currentSpeedA == 0 && currentSpeedB == 0) {
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
    Serial.println("Other: cal, dist, rst, status");
    Serial.println("Turn: turn <degrees>");
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
    resetHeading();
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
  resetHeading();
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
  resetHeading();
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
  resetHeading();
}

bool isNumber(String str) {
  if (str.length() == 0) return false;
  for (unsigned int i = 0; i < str.length(); i++)
    if (!isDigit(str.charAt(i))) return false;
  return true;
}

void rightPulse() {
  unsigned long now = micros();
  rightInterval = now - lastRightTime;
  lastRightTime = now;
  right_count++;
}

void printDistance() {
  float dist = right_count * METERS_PER_PULSE;
  Serial.print("DIST:");
  Serial.print(dist, 3);
  Serial.print("m (");
  Serial.print(right_count);
  Serial.println(" pulses)");
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
  Serial.print("Heading: "); Serial.println(heading, 2);
  Serial.print("Gyro offset: "); Serial.println(gzOffset);
  Serial.print("Right pulses: "); Serial.println(right_count);
  Serial.print("Distance: ");
  Serial.print(right_count * METERS_PER_PULSE, 3);
  Serial.println("m");
  if (pendingDirectionChange)
    Serial.println("Pending direction change in progress...");
  Serial.println("====================");
}
