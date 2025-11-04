const int IN1 = 5;
const int IN2 = 4;
const int ENA = 6;
const int IN3 = 8;
const int IN4 = 7;
const int ENB = 9;

bool forward = true; // Track motor direction

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);

  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);

  Serial.begin(9600);
  Serial.println("Motor ramp test starting...");
  
  setDirection(forward);
}

void loop() {
  Serial.print("Direction: ");
  Serial.println(forward ? "Forward" : "Backward");

  // Ramp up
  for (int speed = 0; speed <= 255; speed++) {
    analogWrite(ENA, speed);
    analogWrite(ENB, speed);
    Serial.print("Speed: ");
    Serial.println(speed);
    delay(20);
  }

  Serial.println("Holding at full speed...");
  delay(1000);

  // Ramp down
  for (int speed = 255; speed >= 0; speed--) {
    analogWrite(ENA, speed);
    analogWrite(ENB, speed);
    Serial.print("Speed: ");
    Serial.println(speed);
    delay(20);
  }

  Serial.println("Motors stopped.");
  delay(1000);

  // Flip direction
  forward = !forward;
  setDirection(forward);
  Serial.println("Changing direction...");
  Serial.println();
}

void setDirection(bool forward) {
  if (forward) {
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





