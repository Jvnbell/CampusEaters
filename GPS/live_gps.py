import argparse
import time
from typing import Optional

# Reuse the parsing + serial helpers you already have.
from test_gps import (  # type: ignore
    FixInfo,
    is_probably_nmea_line,
    nmea_checksum_ok,
    open_serial,
    parse_nmea_fix,
)


def _merge_fix(prev: Optional[FixInfo], new: FixInfo) -> FixInfo:
    if prev is None:
        return new
    return FixInfo(
        lat=new.lat if new.lat is not None else prev.lat,
        lon=new.lon if new.lon is not None else prev.lon,
        fix_type=new.fix_type if new.fix_type is not None else prev.fix_type,
        sats=new.sats if new.sats is not None else prev.sats,
        hdop=new.hdop if new.hdop is not None else prev.hdop,
        altitude_m=new.altitude_m if new.altitude_m is not None else prev.altitude_m,
        speed_knots=new.speed_knots if new.speed_knots is not None else prev.speed_knots,
        status=new.status if new.status is not None else prev.status,
        mode=new.mode if new.mode is not None else prev.mode,
        pdop=new.pdop if new.pdop is not None else prev.pdop,
        hdop_gsa=new.hdop_gsa if new.hdop_gsa is not None else prev.hdop_gsa,
        vdop=new.vdop if new.vdop is not None else prev.vdop,
    )


def _fmt(v, width: int = 0) -> str:
    s = "-" if v is None else str(v)
    return s.rjust(width) if width else s


def _render_line(fix: Optional[FixInfo], last_update_s: Optional[float], ok: int, bad_cs: int) -> str:
    now = time.time()
    age = None if last_update_s is None else (now - last_update_s)

    if fix is None:
        return f"fix: -  sats: -  lat/lon: -  age: -   nmea_ok: {ok}  bad_cs: {bad_cs}"

    lat = f"{fix.lat:.6f}" if fix.lat is not None else "-"
    lon = f"{fix.lon:.6f}" if fix.lon is not None else "-"
    age_s = "-" if age is None else f"{age:5.1f}s"

    spd = "-"
    if fix.speed_knots is not None:
        spd = f"{fix.speed_knots * 1.852:4.1f} km/h"

    hdop = "-" if fix.hdop is None else f"{fix.hdop:.2f}"
    alt = "-" if fix.altitude_m is None else f"{fix.altitude_m:.1f}m"

    return (
        f"fix:{_fmt(fix.fix_type,2)}  "
        f"sats:{_fmt(fix.sats,2)}  "
        f"RMC:{_fmt(fix.status,1)}  "
        f"hdop:{hdop:>5}  "
        f"alt:{alt:>7}  "
        f"spd:{spd:>9}  "
        f"lat:{lat}  lon:{lon}  "
        f"age:{age_s}  "
        f"nmea_ok:{ok}  bad_cs:{bad_cs}"
    )


def main() -> int:
    p = argparse.ArgumentParser(description="Live GPS monitor (updates as you move).")
    p.add_argument("--port", required=True, help="Serial port (e.g. /dev/cu.usbmodem11401, COM3)")
    p.add_argument("--baud", type=int, default=9600, help="Baud rate (default: 9600)")
    p.add_argument("--timeout", type=float, default=0.5, help="Serial read timeout seconds (default: 0.5)")
    p.add_argument("--min-interval", type=float, default=0.2, help="Min redraw interval seconds (default: 0.2)")
    args = p.parse_args()

    fix: Optional[FixInfo] = None
    last_update_s: Optional[float] = None
    ok = 0
    bad_cs = 0

    next_draw = 0.0

    print(f"Live reading from {args.port} @ {args.baud} baud. Ctrl-C to stop.")
    print("")

    try:
        with open_serial(args.port, args.baud, args.timeout) as ser:
            try:
                ser.reset_input_buffer()
            except Exception:
                pass

            while True:
                raw = ser.readline()
                if not raw:
                    # No new data; still refresh occasionally so age increases.
                    now = time.time()
                    if now >= next_draw:
                        line = _render_line(fix, last_update_s, ok, bad_cs)
                        print("\r" + line + " " * 10, end="", flush=True)
                        next_draw = now + args.min_interval
                    continue

                try:
                    line = raw.decode("ascii", errors="replace").strip()
                except Exception:
                    continue

                if not is_probably_nmea_line(line):
                    continue
                if not nmea_checksum_ok(line):
                    bad_cs += 1
                    continue

                ok += 1
                parsed = parse_nmea_fix(line)
                if parsed is not None:
                    fix = _merge_fix(fix, parsed)
                    last_update_s = time.time()

                now = time.time()
                if now >= next_draw:
                    out = _render_line(fix, last_update_s, ok, bad_cs)
                    print("\r" + out + " " * 10, end="", flush=True)
                    next_draw = now + args.min_interval

    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

