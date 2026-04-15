/*
 * NEO-6M on Arduino Mega hardware Serial1 (not required if GPS is on the Pi).
 *
 * Wiring: GPS VCC/GND, GPS TX -> Mega RX1 (pin 19), GPS RX -> Mega TX1 (pin 18) if you reconfigure the module.
 * Default NEO-6M baud: 9600. Open Serial Monitor at 115200 to see NMEA lines.
 *
 * Do not run this on the same USB Serial link as MovingMotor.ino — the Pi expects only motor commands/replies there.
 * Use either: (1) GPS on the Pi + Python GpsReader, or (2) this sketch on a second Arduino / Mega with GPS on Serial1 only.
 */

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);
  Serial.println(F("NEO-6M -> Serial1, forwarding NMEA to USB Serial"));
}

void loop() {
  while (Serial1.available()) {
    Serial.write(Serial1.read());
  }
}
