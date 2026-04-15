#!/usr/bin/env python3
"""Print live GPS fix from NEO-6M (default 9600 baud). Run on Pi: python -m GPS.example_position --port /dev/ttyUSB0"""

from __future__ import annotations

import argparse
import math
import time

from .reader import GpsReader
from .geo import haversine_m, bearing_deg


def main() -> None:
    p = argparse.ArgumentParser(description="Read NEO-6M NMEA and print position")
    p.add_argument("--port", default="/dev/ttyUSB0", help="Serial device (Pi: often /dev/ttyUSB0 or /dev/ttyAMA0)")
    p.add_argument("--baud", type=int, default=9600, help="Baud rate (NEO-6M default 9600)")
    p.add_argument(
        "--target-lat",
        type=float,
        default=None,
        help="Optional target latitude (deg); prints distance and bearing when fix valid",
    )
    p.add_argument(
        "--target-lon",
        type=float,
        default=None,
        help="Optional target longitude (deg)",
    )
    args = p.parse_args()

    with GpsReader(args.port, args.baud) as gps:
        print("Reading NMEA; waiting for fix (clear sky helps). Ctrl+C to stop.\n")
        try:
            while True:
                f = gps.fix
                if f.has_fix:
                    extra = ""
                    if (
                        args.target_lat is not None
                        and args.target_lon is not None
                        and not math.isnan(f.latitude)
                    ):
                        d = haversine_m(f.latitude, f.longitude, args.target_lat, args.target_lon)
                        b = bearing_deg(f.latitude, f.longitude, args.target_lat, args.target_lon)
                        extra = f" | to target: {d:.1f} m, bearing {b:.1f}°"
                    print(
                        f"lat={f.latitude:.7f} lon={f.longitude:.7f} "
                        f"sats={f.satellites} hdop={f.hdop} alt_m={f.altitude_m} "
                        f"speed_m_s={f.speed_m_s}{extra}"
                    )
                else:
                    print("(no fix yet — check antenna, port, baud)")
                time.sleep(1.0)
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
