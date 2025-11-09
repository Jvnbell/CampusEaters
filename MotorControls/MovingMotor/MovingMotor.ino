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

String pendingAction = "";  // store next move after direction change

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
  Serial.println("Motor Control Interface:");
  Serial.println("Direction Commands: f, b, s, fr, fl, br, bl");
  Serial.println("Speed Commands: 0 - 255");

  setDirection(true, true);
  stopMotors();
}

void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toLowerCase();
    if (input.length() == 0) return;
    
    else if (input == "status") {
      printStatus();
    }

    else handleCommand(input);
  }

  rampMotor(currentSpeedA, targetSpeedA, ENA);
  rampMotor(currentSpeedB, targetSpeedB, ENB);

  // When fully stopped and a reversal is pending, complete it and execute next action
  if (pendingDirectionChange && currentSpeedA == 0 && currentSpeedB == 0) {
    setDirection(nextDirectionA, nextDirectionB);
    forwardA = nextDirectionA;
    forwardB = nextDirectionB;
    pendingDirectionChange = false;
    Serial.println("Direction switched safely.");

    // Resume intended action
    if (pendingAction != "") {
      Serial.print("Resuming pending action: ");
      Serial.println(pendingAction);
      handleCommand(pendingAction);
      pendingAction = "";
    }
  }

  delay(rampDelay);
}

void handleCommand(String input) {
  if (input == "?" or input == "help") {
    Serial.println("Motor Control Interface:");
    Serial.println("Direction Commands: f, b, s, fr, fl, br, bl");
    Serial.println("Speed Commands: 0 - 255");
  }
  else if (input == "fr") {
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

// Ramping
void rampMotor(int &currentSpeed, int targetSpeed, int pwmPin) {
  if (currentSpeed < targetSpeed) currentSpeed++;
  else if (currentSpeed > targetSpeed) currentSpeed--;
  analogWrite(pwmPin, currentSpeed);
}

// Straight motion
void safeSetStraight(bool fwd, String command) {
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

// Sharp turns
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
  if (fwdA) { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); }
  else { digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); }

  // Motor B reversed for mirrored layout
  if (fwdB) { digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH); }
  else { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW); }
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

void printStatus() {
  Serial.println("=== MOTOR STATUS ===");
  
  Serial.print("Motor A: ");
  if (currentSpeedA == 0) Serial.print("Stopped");
  else Serial.print(forwardA ? "Forward" : "Backward");
  Serial.print(" | Speed: ");
  Serial.println(currentSpeedA);

  Serial.print("Motor B: ");
  if (currentSpeedB == 0) Serial.print("Stopped");
  else Serial.print(forwardB ? "Forward" : "Backward");
  Serial.print(" | Speed: ");
  Serial.println(currentSpeedB);

  if (pendingDirectionChange) {
    Serial.println("  Pending direction change in progress...");
  }

  Serial.println("====================");
}












