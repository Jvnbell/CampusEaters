const int IN1 = 5;
const int IN2 = 4;
const int ENA = 6;
const int IN3 = 8;
const int IN4 = 7;
const int ENB = 9;

int currentSpeed = 0;     // Current PWM value (0–255)
int targetSpeed = 0;      // Target PWM value (0–255)
bool forward = true;      // Motor direction
bool reversing = false;   // Flag for safe reversal
const int rampDelay = 10; // ms per PWM step (smaller = faster ramp)

const int DEFAULT_START_SPEED = 200; // speed when you press f/b from stopped

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);

  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);

  Serial.begin(9600);
  Serial.println("Motor Control Interface (Safe Reversal + Smooth Ramping)");
  Serial.println("Commands:");
  Serial.println("  f = forward");
  Serial.println("  b = backward");
  Serial.println("  s = stop");
  Serial.println("  0–255 = set PWM speed");
  Serial.println("---------------------------------------");

  // Ensure direction pins reflect the initial desired direction
  setDirection(forward);
  // start stopped
  stopMotors();
}

void loop() {
  // Handle incoming serial commands
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();                 // remove leading/trailing whitespace
    if (input.length() == 0) {    // ignore empty lines (CR/LF)
      return;
    }

    if (input.equalsIgnoreCase("f")) {
      // Always set desired direction to forward
      if (!forward) {
        // currently backward -> perform safe reversal
        reversing = true;
        forward = true;
        Serial.println("Reversing to: Forward");
      } else {
        // already forward — set direction pins and start if stopped
        setDirection(true);
        if (targetSpeed == 0) {
          targetSpeed = DEFAULT_START_SPEED;
          Serial.print("Direction: Forward. Starting to speed ");
          Serial.println(targetSpeed);
        } else {
          Serial.println("Direction: Forward");
        }
      }
    }
    else if (input.equalsIgnoreCase("b")) {
      // Always set desired direction to backward
      if (forward) {
        reversing = true;
        forward = false;
        Serial.println("Reversing to: Backward");
      } else {
        setDirection(false);
        if (targetSpeed == 0) {
          targetSpeed = DEFAULT_START_SPEED;
          Serial.print("Direction: Backward. Starting to speed ");
          Serial.println(targetSpeed);
        } else {
          Serial.println("Direction: Backward");
        }
      }
    }
    else if (input.equalsIgnoreCase("s")) {
      targetSpeed = 0;
      Serial.println("Stopping motors (smooth)...");
    }
    else if (isNumber(input)) {
      targetSpeed = constrain(input.toInt(), 0, 255);
      Serial.print("Target speed set to: ");
      Serial.println(targetSpeed);
    }
    else {
      Serial.print("Unknown command: ");
      Serial.println(input);
    }
  }

  // Handle smooth ramping and safe reversal
  if (reversing) {
    // Step 1: Ramp down to 0 before switching
    if (currentSpeed > 0) {
      currentSpeed--;
      analogWrite(ENA, currentSpeed);
      analogWrite(ENB, currentSpeed);
    } else {
      // Step 2: Switch direction once fully stopped
      setDirection(forward);
      reversing = false;
      Serial.print("Direction switched to: ");
      Serial.println(forward ? "Forward" : "Backward");
      // If targetSpeed is zero (stopped) but we want to start, set default
      if (targetSpeed == 0) {
        targetSpeed = DEFAULT_START_SPEED;
        Serial.print("Starting to speed ");
        Serial.println(targetSpeed);
      }
    }
  } 
  else {
    // Normal speed ramping toward targetSpeed
    if (currentSpeed < targetSpeed) {
      currentSpeed++;
      analogWrite(ENA, currentSpeed);
      analogWrite(ENB, currentSpeed);
    } else if (currentSpeed > targetSpeed) {
      currentSpeed--;
      analogWrite(ENA, currentSpeed);
      analogWrite(ENB, currentSpeed);
    }
  }

  delay(rampDelay);
}

void setDirection(bool fwd) {
  if (fwd) {
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
  } else {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
  }
}

void stopMotors() {
  currentSpeed = 0;
  targetSpeed = 0;
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  // Keep direction pins as-is so future f/b commands behave predictably
}

bool isNumber(String str) {
  if (str.length() == 0) return false;
  for (unsigned int i = 0; i < str.length(); i++) {
    if (!isDigit(str.charAt(i))) return false;
  }
  return true;
}








