const int IN1 = 5;
const int IN2 = 4;
const int ENA = 6;
const int IN3 = 8;
const int IN4 = 7;
const int ENB = 9;

int currentSpeedA = 0;
int currentSpeedB = 0;
int targetSpeedA = 0;
int targetSpeedB = 0;

bool forwardA = true;
bool forwardB = true;
bool pendingDirectionChange = false;
bool nextDirectionA, nextDirectionB;

const int rampDelay = 10;
const int FULL_SPEED = 200;

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);

  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);

  Serial.begin(9600);
  Serial.println("Motor Control Interface: Safe Reversal + Sharp Turns + Smooth Ramping");
  Serial.println("Commands: f, b, s, fr, fl, br, bl, 0–255");
  setDirection(true, true);
  stopMotors();
}

void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toLowerCase();
    if (input.length() == 0) return;

    if (input == "fr") {
      safeMoveSharp(true, true, true);
      Serial.println("Forward-Right (sharp turn)");
    } else if (input == "fl") {
      safeMoveSharp(true, true, false);
      Serial.println("Forward-Left (sharp turn)");
    } else if (input == "br") {
      safeMoveSharp(false, false, true);
      Serial.println("Backward-Right (sharp turn)");
    } else if (input == "bl") {
      safeMoveSharp(false, false, false);
      Serial.println("Backward-Left (sharp turn)");
    } else if (input == "f") {
      safeSetStraight(true);
    } else if (input == "b") {
      safeSetStraight(false);
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

  // Smooth ramping
  rampMotor(currentSpeedA, targetSpeedA, ENA);
  rampMotor(currentSpeedB, targetSpeedB, ENB);

  // Once fully stopped, handle pending direction change
  if (pendingDirectionChange && currentSpeedA == 0 && currentSpeedB == 0) {
    setDirection(nextDirectionA, nextDirectionB);
    forwardA = nextDirectionA;
    forwardB = nextDirectionB;
    pendingDirectionChange = false;
  }

  delay(rampDelay);
}

// Smooth ramping
void rampMotor(int &currentSpeed, int targetSpeed, int pwmPin) {
  if (currentSpeed < targetSpeed) currentSpeed++;
  else if (currentSpeed > targetSpeed) currentSpeed--;
  analogWrite(pwmPin, currentSpeed);
}

// Safe straight motion
void safeSetStraight(bool fwd) {
  if ((forwardA != fwd) || (forwardB != fwd)) {
    // If reversing direction, safely stop first
    pendingDirectionChange = true;
    nextDirectionA = fwd;
    nextDirectionB = fwd;
    targetSpeedA = 0;
    targetSpeedB = 0;
    Serial.println("Safe reversal: slowing to 0 before switching direction...");
  } else {
    targetSpeedA = FULL_SPEED;
    targetSpeedB = FULL_SPEED;
    Serial.print("Moving straight: ");
    Serial.println(fwd ? "Forward" : "Backward");
  }
}

// Safe sharp turn
void safeMoveSharp(bool fwdA, bool fwdB, bool stopLeft) {
  bool dirChange = (forwardA != fwdA) || (forwardB != fwdB);
  if (dirChange) {
    pendingDirectionChange = true;
    nextDirectionA = fwdA;
    nextDirectionB = fwdB;
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
  if (fwdA) { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); }
  else { digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); }

  if (fwdB) { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW); }
  else { digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH); }
}

void stopMotors() {
  targetSpeedA = 0;
  targetSpeedB = 0;
}

bool isNumber(String str) {
  if (str.length() == 0) return false;
  for (unsigned int i = 0; i < str.length(); i++)
    if (!isDigit(str.charAt(i))) return false;
  return true;
}










