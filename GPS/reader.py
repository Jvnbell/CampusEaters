"""Read NEO-6M NMEA over serial (e.g. Pi USB UART /dev/ttyUSB0 at 9600 baud)."""

from __future__ import annotations

import threading
import time
from typing import Callable, Optional

import serial

from .nmea import GpsFix, parse_nmea_sentence


class GpsReader:
    """
    Background thread reads lines and updates latest fix.
    NEO-6M default baud is often 9600; Arduino bridge may use another port than motors.
    """

    def __init__(
        self,
        port: str,
        baudrate: int = 9600,
        on_fix: Optional[Callable[[GpsFix], None]] = None,
    ):
        self._port = port
        self._baudrate = baudrate
        self._on_fix = on_fix
        self._ser: Optional[serial.Serial] = None
        self._fix = GpsFix()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    @property
    def fix(self) -> GpsFix:
        with self._lock:
            return GpsFix(
                latitude=self._fix.latitude,
                longitude=self._fix.longitude,
                altitude_m=self._fix.altitude_m,
                speed_m_s=self._fix.speed_m_s,
                track_true_deg=self._fix.track_true_deg,
                satellites=self._fix.satellites,
                hdop=self._fix.hdop,
                fix_quality=self._fix.fix_quality,
                utc_time=self._fix.utc_time,
                utc_date=self._fix.utc_date,
                raw_sentence=self._fix.raw_sentence,
            )

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._ser = serial.Serial(self._port, self._baudrate, timeout=1)
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        if self._ser and self._ser.is_open:
            self._ser.close()
        self._ser = None

    def _run(self) -> None:
        assert self._ser is not None
        buf = ""
        while not self._stop.is_set():
            try:
                chunk = self._ser.read(self._ser.in_waiting or 1)
                if not chunk:
                    time.sleep(0.01)
                    continue
                buf += chunk.decode("ascii", errors="ignore")
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    with self._lock:
                        updated = parse_nmea_sentence(line, self._fix)
                        if updated is not None:
                            self._fix = updated
                    if updated is not None and self._on_fix:
                        self._on_fix(self.fix)
            except serial.SerialException:
                break

    def __enter__(self) -> "GpsReader":
        self.start()
        return self

    def __exit__(self, *args) -> None:
        self.stop()
