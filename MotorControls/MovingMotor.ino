// Motor A connections
int enA = 9;
int in1 = 8;
int in2 = 7;

// Motor B connections
int enB = 3;
int in3 = 5;
int in4 = 4;

void setup() {
  // Set all motor control pins as outputs
  pinMode(enA, OUTPUT);
  pinMode(enB, OUTPUT);
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
  pinMode(in3, OUTPUT);
  pinMode(in4, OUTPUT);

  // Set both motors to spin forward
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH);
  digitalWrite(in4, LOW);

  // Set speed to maximum
  analogWrite(enA, 255);
  analogWrite(enB, 255);
}

void loop() {
  // Nothing needed — motors keep spinning
}

