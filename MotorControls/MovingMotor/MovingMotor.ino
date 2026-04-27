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
const int FULL_SPEED = 180;   // slightly lower for more control
const int TURN_SPEED = 150;

// ── Encoder ──────────────────────────────────────────────────
volatile long right_count = 0;
volatile unsigned long lastRightTime = 0;
volatile unsigned long rightInterval = 0;

const int MAGNETS = 4;
const float WHEEL_CIRCUMFERENCE_M = 0.471; 
const float METERS_PER_PULSE = WHEEL_CIRCUMFERENCE_M / MAGNETS;

// ── Gyro ─────────────────────────────────────────────────────
MPU6050 mpu;
int16_t gzOffset = 0;
const float GYRO_KP = 2.0;
const float GYRO_DIVISOR = 64.0; // calibrated for chip
const int MAX_GYRO_CORRECTION = 40;
float heading = 0;
float targetHeading = 0;
unsigned long lastIntegrationTime = 0;
unsigned long lastDebugTime = 0;

// ── Route definition ─────────────────────────────────────────
enum StepType { STRAIGHT, TURN, STOP_BOT };

struct RouteStep {
  StepType type;
  float value; // meters for STRAIGHT, degrees for TURN (+right, -left)
};

// ── EDIT ROUTES HERE ─────────────────────────────────────
// Measure distances by walking the route and counting steps
// (1 step ≈ 0.75m) or use a tape measure.
// Positive turn = right, negative turn = left.
//
// Example: go 10m, turn right 90°, go 5m, stop
RouteStep route[] = {
  {STRAIGHT, 10.0},
  {TURN,     90.0},
  {STRAIGHT,  5.0},
  {STOP_BOT,  0.0}  // always end with STOP_BOT
};

const int ROUTE_LEN = sizeof(route) / sizeof(route[0]);
bool routeRunning = false;
int  routeStep = 0;
// ─────────────────────────────────────────────────────────────

void calibrateGyro() {
  Serial.println("Calibrating gyro — keep still...");
  long sum = 0;
  for (int i = 0; i < 200; i++) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    sum += gz;
    delay(10);
  }
  gzOffset = sum / 200;
  Serial.print("gZ offset: "); Serial.println(gzOffset);
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

void updateGyro() {
  unsigned long now = millis();
  float dt = (now - lastIntegrationTime) / 1000.0;
  lastIntegrationTime = now;
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float gzCorrected = gz - gzOffset;
  heading += (gzCorrected / GYRO_DIVISOR) * dt;
}

// ── Ramp a motor toward target ────────────────────────────────
void rampMotor(int &cur, int tgt, int pin) {
  if (cur < tgt) cur++;
  else if (cur > tgt) cur--;
  analogWrite(pin, cur);
}

// ── Ramp both motors to zero ──────────────────────────────────
void rampToStop() {
  targetSpeedA = 0;
  targetSpeedB = 0;
  while (currentSpeedA > 0 || currentSpeedB > 0) {
    rampMotor(currentSpeedA, 0, ENA);
    rampMotor(currentSpeedB, 0, ENB);
    delay(rampDelay);
  }
}

// ── Drive straight for a given distance ──────────────────────
void executeStraight(float meters) {
  resetEncoder();
  resetHeading();

  long targetPulses = (long)(meters / METERS_PER_PULSE);

  Serial.print("Driving ");
  Serial.print(meters);
  Serial.print("m (");
  Serial.print(targetPulses);
  Serial.println(" pulses)");

  setDirection(true, true);
  targetSpeedA = FULL_SPEED;
  targetSpeedB = FULL_SPEED;

  while (right_count < targetPulses) {
    updateGyro();

    // Gyro heading correction
    float error = heading - targetHeading;
    if (abs(error) < 1.5) error = 0;
    int correction = constrain((int)(GYRO_KP * error),
                               -MAX_GYRO_CORRECTION,
                                MAX_GYRO_CORRECTION);

    adjustedA = constrain(targetSpeedA - correction, 0, 255);
    adjustedB = constrain(targetSpeedB + correction, 0, 255);

    rampMotor(currentSpeedA, adjustedA, ENA);
    rampMotor(currentSpeedB, adjustedB, ENB);

    // Check for abort
    if (Serial.available()) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim(); cmd.toLowerCase();
      if (cmd == "s") {
        rampToStop();
        routeRunning = false;
        Serial.println("Route aborted.");
        return;
      }
    }

    if (millis() - lastDebugTime >= 500) {
      lastDebugTime = millis();
      Serial.print("  Pulses: "); Serial.print(right_count);
      Serial.print("/"); Serial.print(targetPulses);
      Serial.print("  H: "); Serial.print(heading, 1);
      Serial.print("  Corr: "); Serial.println(correction);
    }

    delay(rampDelay);
  }

  rampToStop();
  Serial.println("Straight done.");
}

// ── Turn by a given angle using gyro ─────────────────────────
void executeTurn(float targetAngle) {
  resetHeading();

  Serial.print("Turning ");
  Serial.print(targetAngle);
  Serial.println(" degrees...");

  bool turnRight = (targetAngle > 0);

  setDirection(true, true);
  if (turnRight) {
    targetSpeedA = 0;
    targetSpeedB = TURN_SPEED;
  } else {
    targetSpeedA = TURN_SPEED;
    targetSpeedB = 0;
  }

  unsigned long startTime = millis();
  const unsigned long TIMEOUT = 6000;

  while (millis() - startTime < TIMEOUT) {
    updateGyro();

    rampMotor(currentSpeedA, targetSpeedA, ENA);
    rampMotor(currentSpeedB, targetSpeedB, ENB);

    // Slow down for final 20 degrees
    float remaining = abs(targetAngle) - abs(heading);
    if (remaining < 20.0) {
      if (turnRight) targetSpeedB = TURN_SPEED / 2;
      else           targetSpeedA = TURN_SPEED / 2;
    }

    // Check for abort
    if (Serial.available()) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim(); cmd.toLowerCase();
      if (cmd == "s") {
        rampToStop();
        routeRunning = false;
        Serial.println("Route aborted.");
        return;
      }
    }

    if (abs(heading) >= abs(targetAngle) * 0.95) break;

    delay(rampDelay);
  }

  rampToStop();
  Serial.print("TURN_DONE:"); Serial.println(heading);
  resetHeading();
}

// ── Execute next route step ───────────────────────────────────
void runNextStep() {
  if (routeStep >= ROUTE_LEN) {
    routeRunning = false;
    Serial.println("Route complete.");
    return;
  }

  RouteStep &step = route[routeStep];
  Serial.print("[Step "); Serial.print(routeStep + 1);
  Serial.print("/"); Serial.print(ROUTE_LEN - 1); Serial.print("] ");

  switch (step.type) {
    case STRAIGHT:
      executeStraight(step.value);
      break;
    case TURN:
      executeTurn(step.value);
      break;
    case STOP_BOT:
      rampToStop();
      routeRunning = false;
      Serial.println("Route complete — destination reached.");
      return;
  }

  if (routeRunning) {
    routeStep++;
    delay(300); // brief pause between steps
  }
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT); pinMode(ENA, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT); pinMode(ENB, OUTPUT);

  pinMode(3, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(3), rightPulse, FALLING);

  Serial.begin(115200);
  Wire.begin();
  mpu.initialize();
  mpu.setFullScaleGyroRange(0);

  if (mpu.testConnection()) {
    Serial.println("MPU6050 connected.");
    calibrateGyro();
  } else {
    Serial.println("MPU6050 not found.");
  }

  Serial.println("=== CampusEats Route Executor ===");
  Serial.println("Commands:");
  Serial.println("  go    — start autonomous route");
  Serial.println("  s     — stop / abort route");
  Serial.println("  f     — forward");
  Serial.println("  b     — backward");
  Serial.println("  fr/fl — pivot right/left");
  Serial.println("  dist  — show distance");
  Serial.println("  rst   — reset encoder");
  Serial.println("  cal   — recalibrate gyro");
  Serial.println("  turn <deg> — single turn");
  Serial.print("Route has "); Serial.print(ROUTE_LEN - 1);
  Serial.println(" steps loaded.");

  resetHeading();
  resetEncoder();
  setDirection(true, true);
  stopMotors();
}

// ── Main loop ─────────────────────────────────────────────────
void loop() {
  // If route is running, execute next step
  if (routeRunning) {
    runNextStep();
    return;
  }

  // Handle serial commands
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toLowerCase();
    if (input.length() == 0) return;

    if (input == "go") {
      routeStep = 0;
      routeRunning = true;
      Serial.println("Starting route...");
    }
    else if (input == "s") {
      routeRunning = false;
      targetSpeedA = 0;
      targetSpeedB = 0;
      Serial.println("Stopped.");
    }
    else if (input == "cal") {
      calibrateGyro();
    }
    else if (input == "dist") {
      printDistance();
    }
    else if (input == "rst") {
      resetEncoder();
      Serial.println("Encoder reset.");
    }
    else if (input == "status") {
      printStatus();
    }
    else if (input.startsWith("turn")) {
      float angle = input.substring(4).toFloat();
      if (angle != 0) executeTurn(angle);
      else Serial.println("Usage: turn <degrees>");
    }
    else if (input == "f") {
      safeSetStraight(true, input);
    }
    else if (input == "b") {
      safeSetStraight(false, input);
    }
    else if (input == "fr") {
      safeMoveSharp(true, true, true, input);
    }
    else if (input == "fl") {
      safeMoveSharp(true, true, false, input);
    }
    else if (input == "br") {
      safeMoveSharp(false, false, true, input);
    }
    else if (input == "bl") {
      safeMoveSharp(false, false, false, input);
    }
    else if (isNumber(input)) {
      int val = constrain(input.toInt(), 0, 255);
      targetSpeedA = val;
      targetSpeedB = val;
      resetHeading();
      Serial.print("Speed: "); Serial.println(val);
    }
    else {
      Serial.print("Unknown: "); Serial.println(input);
    }
  }

  // Normal straight-line gyro correction when driving manually
  bool movingStraight = (targetSpeedA > 0 && targetSpeedB > 0 && forwardA == forwardB);
  adjustedA = targetSpeedA;
  adjustedB = targetSpeedB;

  if (movingStraight) {
    updateGyro();
    float error = heading - targetHeading;
    if (abs(error) < 1.5) error = 0;
    int correction = constrain((int)(GYRO_KP * error),
                               -MAX_GYRO_CORRECTION, MAX_GYRO_CORRECTION);
    adjustedA = constrain(targetSpeedA - correction, 0, 255);
    adjustedB = constrain(targetSpeedB + correction, 0, 255);
  } else {
    updateGyro();
    if (targetSpeedA == 0 && targetSpeedB == 0) resetHeading();
  }

  rampMotor(currentSpeedA, adjustedA, ENA);
  rampMotor(currentSpeedB, adjustedB, ENB);

  if (pendingDirectionChange && currentSpeedA == 0 && currentSpeedB == 0) {
    setDirection(nextDirectionA, nextDirectionB);
    forwardA = nextDirectionA;
    forwardB = nextDirectionB;
    pendingDirectionChange = false;
    Serial.println("Direction switched safely.");
    if (pendingAction != "") {
      handleCommand(pendingAction);
      pendingAction = "";
    }
  }

  delay(rampDelay);
}

// ── Helpers ───────────────────────────────────────────────────
void handleCommand(String input) {
  if (input == "f") safeSetStraight(true, input);
  else if (input == "b") safeSetStraight(false, input);
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
    Serial.println("Safe reversal in progress...");
  } else {
    targetSpeedA = FULL_SPEED;
    targetSpeedB = FULL_SPEED;
    setDirection(fwd, fwd);
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
  } else {
    setDirection(fwdA, fwdB);
    targetSpeedA = stopLeft ? 0 : FULL_SPEED;
    targetSpeedB = stopLeft ? FULL_SPEED : 0;
  }
}

void setDirection(bool fwdA, bool fwdB) {
  if (fwdA) { digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH); }
  else       { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);  }
  if (fwdB)  { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);  }
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
  Serial.print("DIST:"); Serial.print(dist, 3);
  Serial.print("m ("); Serial.print(right_count);
  Serial.println(" pulses)");
}

void printStatus() {
  Serial.println("=== STATUS ===");
  Serial.print("Route running: "); Serial.println(routeRunning ? "YES" : "NO");
  Serial.print("Step: "); Serial.print(routeStep); Serial.print("/");
  Serial.println(ROUTE_LEN - 1);
  Serial.print("Heading: "); Serial.println(heading, 2);
  Serial.print("Right pulses: "); Serial.println(right_count);
  Serial.print("Distance: ");
  Serial.print(right_count * METERS_PER_PULSE, 3); Serial.println("m");
  Serial.println("==============");
}
