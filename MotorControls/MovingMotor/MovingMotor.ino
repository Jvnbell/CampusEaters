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
int targetSpeedA  = 0;
int targetSpeedB  = 0;
int adjustedA = 0;
int adjustedB = 0;

bool forwardA = true;
bool forwardB = true;
bool pendingDirectionChange = false;
bool nextDirectionA, nextDirectionB;
String pendingAction = "";

const int rampDelay  = 10;
const int FULL_SPEED = 180;
const int TURN_SPEED = 100;

// ── Encoder ──────────────────────────────────────────────────
volatile long          right_count   = 0;
volatile unsigned long lastRightTime = 0;
volatile unsigned long rightInterval = 0;

const int   MAGNETS             = 4;
const float WHEEL_CIRCUMFERENCE_M = 0.471; 
const float METERS_PER_PULSE    = WHEEL_CIRCUMFERENCE_M / MAGNETS;

// ── Gyro ─────────────────────────────────────────────────────
MPU6050 mpu;
int16_t gzOffset    = 0;
const float GYRO_KP          = 2.0;
const float GYRO_DIVISOR     = 64.0;
const int   MAX_GYRO_CORRECTION = 40;
float heading             = 0;
float targetHeading       = 0;
unsigned long lastIntegrationTime = 0;
unsigned long lastDebugTime       = 0;

// ── Gyro helpers ──────────────────────────────────────────────
void calibrateGyro() {
  Serial.println("Calibrating gyro — keep still...");
  long sum = 0;
  for (int i = 0; i < 200; i++) {
    int16_t ax,ay,az,gx,gy,gz;
    mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
    sum += gz;
    delay(10);
  }
  gzOffset = sum / 200;
  Serial.print("gZ offset: "); Serial.println(gzOffset);
  Serial.println("Calibration done.");
}

void resetHeading() {
  heading = 0; targetHeading = 0;
  lastIntegrationTime = millis();
}

void updateGyro() {
  unsigned long now = millis();
  float dt = (now - lastIntegrationTime) / 1000.0;
  lastIntegrationTime = now;
  int16_t ax,ay,az,gx,gy,gz;
  mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
  heading += ((gz - gzOffset) / GYRO_DIVISOR) * dt;
}

// ── Encoder helpers ───────────────────────────────────────────
void resetEncoder() {
  noInterrupts();
  right_count  = 0;
  rightInterval = 0;
  interrupts();
}

void rightPulse() {
  unsigned long now = micros();
  rightInterval = now - lastRightTime;
  lastRightTime  = now;
  right_count++;
}

// ── Motor helpers ─────────────────────────────────────────────
void rampMotor(int &cur, int tgt, int pin) {
  if      (cur < tgt) cur++;
  else if (cur > tgt) cur--;
  analogWrite(pin, cur);
}

void rampToStop() {
  targetSpeedA = 0; targetSpeedB = 0;
  while (currentSpeedA > 0 || currentSpeedB > 0) {
    rampMotor(currentSpeedA, 0, ENA);
    rampMotor(currentSpeedB, 0, ENB);
    delay(rampDelay);
  }
}

void setDirection(bool fwdA, bool fwdB) {
  if (fwdA) { digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH); }
  else       { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);  }
  if (fwdB)  { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);  }
  else        { digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH); }
}

void stopMotors() {
  targetSpeedA = 0; targetSpeedB = 0;
  adjustedA    = 0; adjustedB    = 0;
  resetHeading();
}

// ── Check for abort during long operations ────────────────────
bool checkAbort() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim(); cmd.toLowerCase();
    if (cmd == "s") {
      rampToStop();
      Serial.println("ABORTED");
      return true;
    }
  }
  return false;
}

// ── STRAIGHT command ──────────────────────────────────────────
// Drives forward a given distance using encoder, gyro keeps straight.
// Prints STRAIGHT_DONE when complete.
void executeStraight(float meters) {
  resetEncoder();
  resetHeading();

  long targetPulses = (long)(meters / METERS_PER_PULSE);
  Serial.print("Straight "); Serial.print(meters);
  Serial.print("m ("); Serial.print(targetPulses); Serial.println(" pulses)");

  setDirection(true, true);
  targetSpeedA = FULL_SPEED;
  targetSpeedB = FULL_SPEED;

  while (right_count < targetPulses) {
    updateGyro();

    float error = heading - targetHeading;
    if (abs(error) < 1.5) error = 0;
    int correction = constrain((int)(GYRO_KP * error),
                               -MAX_GYRO_CORRECTION, MAX_GYRO_CORRECTION);

    adjustedA = constrain(targetSpeedA - correction, 0, 255);
    adjustedB = constrain(targetSpeedB + correction, 0, 255);

    rampMotor(currentSpeedA, adjustedA, ENA);
    rampMotor(currentSpeedB, adjustedB, ENB);

    if (checkAbort()) return;

    if (millis() - lastDebugTime >= 500) {
      lastDebugTime = millis();
      Serial.print("  "); Serial.print(right_count);
      Serial.print("/"); Serial.print(targetPulses);
      Serial.print(" H:"); Serial.println(heading, 1);
    }

    delay(rampDelay);
  }

  rampToStop();
  Serial.println("STRAIGHT_DONE");
}

// ── TURN command ──────────────────────────────────────────────
// Turns by given degrees using gyro.
// Prints TURN_DONE:<actual_heading> when complete.
void executeTurn(float targetAngle) {
  resetHeading();
  Serial.print("Turn "); Serial.print(targetAngle); Serial.println("deg");

  bool turnRight = (targetAngle > 0);
  setDirection(true, true);

  if (turnRight) { targetSpeedA = 0;         targetSpeedB = TURN_SPEED; }
  else           { targetSpeedA = TURN_SPEED; targetSpeedB = 0;          }

  unsigned long startTime = millis();
  const unsigned long TIMEOUT = 6000;

  while (millis() - startTime < TIMEOUT) {
    updateGyro();
    rampMotor(currentSpeedA, targetSpeedA, ENA);
    rampMotor(currentSpeedB, targetSpeedB, ENB);

    // Slow down for final 20 degrees
    float remaining = abs(targetAngle) - abs(heading);
    if (remaining < 35.0) {
      if (turnRight) targetSpeedB = 40;//TURN_SPEED / 2;
      else           targetSpeedA = 40;//TURN_SPEED / 2;
    }

    if (checkAbort()) return;
    if (abs(heading) >= abs(targetAngle) * 0.95) break;

    delay(rampDelay);
  }

  rampToStop();
  Serial.print("TURN_DONE:"); Serial.println(heading);
  resetHeading();
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  pinMode(IN1,OUTPUT); pinMode(IN2,OUTPUT); pinMode(ENA,OUTPUT);
  pinMode(IN3,OUTPUT); pinMode(IN4,OUTPUT); pinMode(ENB,OUTPUT);

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

  Serial.println("=== CampusEats ===");
  Serial.println("Commands:");
  Serial.println("  straight <m>  — drive distance");
  Serial.println("  turn <deg>    — gyro turn");
  Serial.println("  f/b/fr/fl/s   — manual drive");
  Serial.println("  dist/rst/cal  — diagnostics");

  resetHeading();
  resetEncoder();
  setDirection(true, true);
  stopMotors();
}

// ── Main loop ─────────────────────────────────────────────────
void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toLowerCase();
    if (input.length() == 0) return;

    if (input.startsWith("straight ")) {
      float meters = input.substring(9).toFloat();
      if (meters > 0) executeStraight(meters);
      else Serial.println("Usage: straight <meters>");
    }
    else if (input.startsWith("turn ")) {
      float angle = input.substring(5).toFloat();
      if (angle != 0) executeTurn(angle);
      else Serial.println("Usage: turn <degrees>");
    }
    else if (input == "s") {
      targetSpeedA = 0; targetSpeedB = 0;
      Serial.println("Stopped.");
    }
    else if (input == "f")  safeSetStraight(true,  input);
    else if (input == "b")  safeSetStraight(false, input);
    else if (input == "fr") safeMoveSharp(true,  true,  true,  input);
    else if (input == "fl") safeMoveSharp(true,  true,  false, input);
    else if (input == "br") safeMoveSharp(false, false, true,  input);
    else if (input == "bl") safeMoveSharp(false, false, false, input);
    else if (input == "cal")    calibrateGyro();
    else if (input == "dist")   printDistance();
    else if (input == "rst")    { resetEncoder(); Serial.println("Encoder reset."); }
    else if (input == "status") printStatus();
    else if (isNumber(input)) {
      int val = constrain(input.toInt(), 0, 255);
      targetSpeedA = val; targetSpeedB = val;
      resetHeading();
      Serial.print("Speed: "); Serial.println(val);
    }
    else { Serial.print("Unknown: "); Serial.println(input); }
  }

  // Gyro correction during manual straight driving
  updateGyro();
  bool movingStraight = (targetSpeedA > 0 && targetSpeedB > 0 && forwardA == forwardB);
  adjustedA = targetSpeedA;
  adjustedB = targetSpeedB;

  if (movingStraight) {
    float error = heading - targetHeading;
    if (abs(error) < 1.5) error = 0;
    int correction = constrain((int)(GYRO_KP * error),
                               -MAX_GYRO_CORRECTION, MAX_GYRO_CORRECTION);
    adjustedA = constrain(targetSpeedA - correction, 0, 255);
    adjustedB = constrain(targetSpeedB + correction, 0, 255);
  } else {
    if (targetSpeedA == 0 && targetSpeedB == 0) resetHeading();
  }

  rampMotor(currentSpeedA, adjustedA, ENA);
  rampMotor(currentSpeedB, adjustedB, ENB);

  if (pendingDirectionChange && currentSpeedA == 0 && currentSpeedB == 0) {
    setDirection(nextDirectionA, nextDirectionB);
    forwardA = nextDirectionA; forwardB = nextDirectionB;
    pendingDirectionChange = false;
    Serial.println("Direction switched safely.");
    if (pendingAction != "") {
      if (pendingAction == "f") safeSetStraight(true,  pendingAction);
      if (pendingAction == "b") safeSetStraight(false, pendingAction);
      pendingAction = "";
    }
  }

  delay(rampDelay);
}

// ── Manual movement ───────────────────────────────────────────
void safeSetStraight(bool fwd, String command) {
  resetHeading();
  if ((forwardA != fwd) || (forwardB != fwd)) {
    pendingDirectionChange = true;
    nextDirectionA = fwd; nextDirectionB = fwd;
    pendingAction  = command;
    targetSpeedA   = 0;   targetSpeedB   = 0;
    Serial.println("Safe reversal...");
  } else {
    targetSpeedA = FULL_SPEED; targetSpeedB = FULL_SPEED;
    setDirection(fwd, fwd);
    Serial.println(fwd ? "Forward" : "Backward");
  }
}

void safeMoveSharp(bool fwdA, bool fwdB, bool stopLeft, String command) {
  resetHeading();
  if ((forwardA != fwdA) || (forwardB != fwdB)) {
    pendingDirectionChange = true;
    nextDirectionA = fwdA; nextDirectionB = fwdB;
    pendingAction  = command;
    targetSpeedA   = 0;    targetSpeedB   = 0;
  } else {
    setDirection(fwdA, fwdB);
    targetSpeedA = stopLeft ? 0          : FULL_SPEED;
    targetSpeedB = stopLeft ? FULL_SPEED : 0;
  }
}

// ── Diagnostics ───────────────────────────────────────────────
bool isNumber(String str) {
  if (str.length() == 0) return false;
  for (unsigned int i = 0; i < str.length(); i++)
    if (!isDigit(str.charAt(i))) return false;
  return true;
}

void printDistance() {
  float dist = right_count * METERS_PER_PULSE;
  Serial.print("DIST:"); Serial.print(dist, 3);
  Serial.print("m ("); Serial.print(right_count); Serial.println(" pulses)");
}

void printStatus() {
  Serial.println("=== STATUS ===");
  Serial.print("Heading: ");  Serial.println(heading, 2);
  Serial.print("Distance: "); Serial.print(right_count * METERS_PER_PULSE, 3); Serial.println("m");
  Serial.print("Pulses: ");   Serial.println(right_count);
  Serial.print("SpeedA: ");   Serial.print(currentSpeedA);
  Serial.print("  SpeedB: "); Serial.println(currentSpeedB);
  Serial.println("==============");
}
