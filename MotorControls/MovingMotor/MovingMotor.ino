// Motor A connections
int enA = 9;
int in1 = 8;
int in2 = 7;

// Motor B connections
int enB = 3;
int in3 = 5;
int in4 = 4;

int speedValue = 150; // default PWM (out of 255)

void forward() {
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH);
  digitalWrite(in4, LOW);
  analogWrite(enA, speedValue);
  analogWrite(enB, speedValue);
}

void backward() {
  digitalWrite(in1, LOW);
  digitalWrite(in2, HIGH);
  digitalWrite(in3, LOW);
  digitalWrite(in4, HIGH);
  analogWrite(enA, speedValue);
  analogWrite(enB, speedValue);
}

void turnLeft() {
  digitalWrite(in1, LOW);
  digitalWrite(in2, HIGH);
  digitalWrite(in3, HIGH);
  digitalWrite(in4, LOW);
  analogWrite(enA, speedValue);
  analogWrite(enB, speedValue);
}

void turnRight() {
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  digitalWrite(in3, LOW);
  digitalWrite(in4, HIGH);
  analogWrite(enA, speedValue);
  analogWrite(enB, speedValue);
}

void stopMotors() {
  analogWrite(enA, 0);
  analogWrite(enB, 0);
}


void setup() {
  Serial.begin(9600);
  pinMode(enA, OUTPUT);
  pinMode(enB, OUTPUT);
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
  pinMode(in3, OUTPUT);
  pinMode(in4, OUTPUT);
  Serial.println("Ready for commands (f/b/l/r/s/1–9)");
}


void loop() {
  if (Serial.available() > 0) {
  char cmd = Serial.read();
  if (cmd == '\n' || cmd == '\r') return; // ignore line endings
  
  cmd = tolower(cmd);
  switch (cmd) {
    case 'f': forward(); Serial.println("Forward"); break;
    case 'b': backward(); Serial.println("Backward"); break;
    case 'l': turnLeft(); Serial.println("Left"); break;
    case 'r': turnRight(); Serial.println("Right"); break;
    case 's': stopMotors(); Serial.println("Stop"); break;
    case '1'...'9':
      speedValue = map(cmd - '0', 1, 9, 50, 255);
      Serial.print("Speed set to: ");
      Serial.println(speedValue);
      break;
    default:
      Serial.println("Unknown command");
  }
  }
}


