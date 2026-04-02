const int IN1 = 5;
const int IN2 = 4;
const int ENA = 6;  // RIGHT motor
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
const int TRIM_B = 0;

// Encoder counts
volatile int left_count = 0;
volatile int right_count = 0;

// Interval-based speed measurement (microseconds between pulses)
volatile unsigned long lastLeftTime = 0;
volatile unsigned long lastRightTime = 0;
volatile unsigned long leftInterval = 0;
volatile unsigned long rightInterval = 0;

// Rolling average instead of PI — survives resets gracefully
const int HISTORY = 5;
long diffHistory[HISTORY] = {0, 0, 0, 0, 0};
int diffIndex = 0;

unsigned long lastTime = 0;

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(2), leftPulse, FALLING);
  attachInterrupt(digitalPinToInterrupt(3), rightPulse, FALLING);

  Serial.begin(115200);
  Serial.println("Motor Control Interface:");
  Serial.println("Direction Commands: f, b, s, fr, fl, br, bl");
  Serial.println("Speed Commands: 0-255");
  Serial.println("Other: ?, help, status");

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
      if (input == "status") printStatus();
      else handleCommand(input);
    }
  }

  // 2. Compute correction every 500ms
  bool movingStraight = (targetSpeedA > 0 && targetSpeedB > 0 && forwardA == forwardB);

  if (millis() - lastTime >= 500) {
    lastTime = millis();

    if (movingStraight) {
      // Safely copy volatile values
      unsigned long lInt, rInt;
      noInterrupts();
      lInt = leftInterval;
      rInt = rightInterval;
      interrupts();

      // If no pulse in over 1 second, treat wheel as stopped
      unsigned long now = micros();
      if ((now - lastLeftTime) > 1000000) lInt = 0;
      if ((now - lastRightTime) > 1000000) rInt = 0;

      // Spike filter — skip obviously bad readings
      if (lInt > 0 && rInt > 0 && abs((long)rInt - (long)lInt) > 50000) {
        Serial.print("L_us:"); Serial.print(lInt);
        Serial.print(" R_us:"); Serial.print(rInt);
        Serial.println(" (spike — skipping)");
        return;
      }

      long diff = 0;
      if (lInt > 0 && rInt > 0) {
        diff = (long)rInt - (long)lInt;
        if (abs(diff) < 3000) diff = 0;  // deadband — ignore noise under 3ms
      }

      // Rolling average over last 5 readings
      diffHistory[diffIndex % HISTORY] = diff;
      diffIndex++;

      long smoothDiff = 0;
      for (int i = 0; i < HISTORY; i++) smoothDiff += diffHistory[i];
      smoothDiff /= HISTORY;

      float Kp = 0.004;
      int correction = constrain((int)(Kp * smoothDiff), -20, 20);

      // A = right motor, B = left motor
      // Positive smoothDiff = right slower = speed up right, slow down left
      adjustedA = constrain(targetSpeedA + correction, 0, 255);  // right motor
      adjustedB = constrain(targetSpeedB - correction, 0, 255);  // left motor

      Serial.print("L_us:"); Serial.print(lInt);
      Serial.print(" R_us:"); Serial.print(rInt);
      Serial.print(" diff:"); Serial.print(diff);
      Serial.print(" smooth:"); Serial.print(smoothDiff);
      Serial.print(" corr:"); Serial.print(correction);
      Serial.print(" A(R):"); Serial.print(adjustedA);
      Serial.print(" B(L):"); Serial.println(adjustedB);
    } else {
      // Not going straight — reset history and targets
      for (int i = 0; i < HISTORY; i++) diffHistory[i] = 0;
      diffIndex = 0;
      adjustedA = targetSpeedA;
      adjustedB = targetSpeedB;
      Serial.println("(not moving straight — no correction)");
    }
  }

  // 3. Ramp motors toward persistent adjusted targets
  rampMotor(currentSpeedA, adjustedA, ENA);
  rampMotor(currentSpeedB, adjustedB, ENB);

  // 4. Complete pending direction change once fully stopped
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
    targetSpeedB = constrain(val + TRIM_B, 0, 255);
    adjustedA = targetSpeedA;
    adjustedB = targetSpeedB;
    Serial.print("Target speed set to: ");
    Serial.print(val);
    Serial.print(" (A="); Serial.print(adjustedA);
    Serial.print(" B="); Serial.print(adjustedB);
    Serial.println(")");
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
  if ((forwardA != fwd) || (forwardB != fwd)) {
    pendingDirectionChange = true;
    nextDirectionA = fwd;
    nextDirectionB = fwd;
    pendingAction = command;
    targetSpeedA = 0;
    targetSpeedB = 0;
    adjustedA = 0;
    adjustedB = 0;
    Serial.println("Safe reversal: slowing to 0 before switching direction...");
  } else {
    targetSpeedA = FULL_SPEED;
    targetSpeedB = constrain(FULL_SPEED + TRIM_B, 0, 255);
    adjustedA = targetSpeedA;
    adjustedB = targetSpeedB;
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
    adjustedA = 0;
    adjustedB = 0;
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
    adjustedA = targetSpeedA;
    adjustedB = targetSpeedB;
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
  for (int i = 0; i < HISTORY; i++) diffHistory[i] = 0;
  diffIndex = 0;
}

bool isNumber(String str) {
  if (str.length() == 0) return false;
  for (unsigned int i = 0; i < str.length(); i++)
    if (!isDigit(str.charAt(i))) return false;
  return true;
}

void leftPulse() {
  unsigned long now = micros();
  leftInterval = now - lastLeftTime;
  lastLeftTime = now;
  left_count++;
}

void rightPulse() {
  unsigned long now = micros();
  rightInterval = now - lastRightTime;
  lastRightTime = now;
  right_count++;
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

  if (pendingDirectionChange)
    Serial.println("  Pending direction change in progress...");
  Serial.println("====================");
}
