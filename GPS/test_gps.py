import argparse
import sys
import time
from dataclasses import dataclass


def _require_pyserial():
    try:
        import serial  # noqa: F401
        from serial.tools import list_ports  # noqa: F401
    except Exception as e:
        print("Missing dependency: pyserial")
        print("Install it with:")
        print("  python -m pip install pyserial")
        print("")
        print(f"Import error: {e}")
        raise SystemExit(2)


def list_serial_ports():
    _require_pyserial()
    from serial.tools import list_ports

    ports = []
    for p in list_ports.comports():
        ports.append(
            {
                "device": p.device,
                "description": p.description,
                "hwid": p.hwid,
                "manufacturer": getattr(p, "manufacturer", None),
                "product": getattr(p, "product", None),
                "serial_number": getattr(p, "serial_number", None),
                "vid": getattr(p, "vid", None),
                "pid": getattr(p, "pid", None),
            }
        )
    return ports


def is_probably_nmea_line(line: str) -> bool:
    # Typical NMEA: $GPRMC,...*hh
    line = line.strip()
    if not line.startswith("$"):
        return False
    star = line.rfind("*")
    if star == -1 or star + 3 > len(line):
        return False
    checksum = line[star + 1 : star + 3]
    return all(c in "0123456789ABCDEFabcdef" for c in checksum)


def nmea_checksum_ok(line: str) -> bool:
    line = line.strip()
    if not line.startswith("$"):
        return False
    star = line.rfind("*")
    if star == -1:
        return False
    body = line[1:star]
    try:
        expected = int(line[star + 1 : star + 3], 16)
    except Exception:
        return False
    cs = 0
    for ch in body:
        cs ^= ord(ch)
    return cs == expected


def _dm_to_decimal(dm: str, hemi: str):
    if not dm:
        return None
    try:
        v = float(dm)
    except Exception:
        return None
    deg = int(v // 100)
    minutes = v - deg * 100
    dec = deg + minutes / 60.0
    hemi = (hemi or "").upper()
    if hemi in {"S", "W"}:
        dec = -dec
    return dec


@dataclass
class FixInfo:
    lat: float | None = None
    lon: float | None = None
    fix_type: int | None = None  # GGA: 0 invalid, 1 GPS fix, 2 DGPS, ...
    sats: int | None = None
    speed_knots: float | None = None  # RMC
    status: str | None = None  # RMC: A/V


def parse_nmea_fix(line: str) -> FixInfo | None:
    line = line.strip()
    if not line.startswith("$"):
        return None
    star = line.rfind("*")
    core = line[1:star] if star != -1 else line[1:]
    parts = core.split(",")
    if not parts:
        return None

    talker_and_type = parts[0].upper()
    msg_type = talker_and_type[-3:]

    # $--GGA: time, lat, N/S, lon, E/W, fix, sats, ...
    if msg_type == "GGA" and len(parts) >= 8:
        lat = _dm_to_decimal(parts[2], parts[3])
        lon = _dm_to_decimal(parts[4], parts[5])
        try:
            fix_type = int(parts[6]) if parts[6] else None
        except Exception:
            fix_type = None
        try:
            sats = int(parts[7]) if parts[7] else None
        except Exception:
            sats = None
        return FixInfo(lat=lat, lon=lon, fix_type=fix_type, sats=sats)

    # $--RMC: time, status(A/V), lat, N/S, lon, E/W, speed(knots), ...
    if msg_type == "RMC" and len(parts) >= 8:
        status = parts[2].upper() if parts[2] else None
        lat = _dm_to_decimal(parts[3], parts[4])
        lon = _dm_to_decimal(parts[5], parts[6])
        try:
            speed_knots = float(parts[7]) if parts[7] else None
        except Exception:
            speed_knots = None
        return FixInfo(lat=lat, lon=lon, speed_knots=speed_knots, status=status)

    return None


def open_serial(port: str, baud: int, timeout_s: float):
    _require_pyserial()
    import serial

    # pyserial accepts COM10 etc, but '\\\\.\\COM10' is also safe on Windows
    if port.upper().startswith("COM") and len(port) > 4:
        port = r"\\.\\" + port

    return serial.Serial(
        port=port,
        baudrate=baud,
        timeout=timeout_s,
        write_timeout=timeout_s,
    )


def pick_port_interactively(ports):
    if not ports:
        print("No serial ports detected.")
        print("If the GPS is plugged in, check Windows Device Manager → Ports (COM & LPT).")
        raise SystemExit(1)

    if len(ports) == 1:
        return ports[0]["device"]

    print("Detected serial ports:")
    for i, p in enumerate(ports, start=1):
        desc = p.get("description") or ""
        hwid = p.get("hwid") or ""
        print(f"  [{i}] {p['device']}  {desc}  {hwid}")

    while True:
        choice = input(f"Select port (1-{len(ports)}): ").strip()
        try:
            idx = int(choice)
            if 1 <= idx <= len(ports):
                return ports[idx - 1]["device"]
        except Exception:
            pass
        print("Invalid selection.")


def run_capture(port: str, baud: int, seconds: float, timeout_s: float, max_lines: int):
    ok_nmea = 0
    ok_checksum = 0
    total_lines = 0
    last_fix: FixInfo | None = None
    sentence_counts: dict[str, int] = {}
    first_good_lines: list[str] = []
    last_raw_line: str | None = None

    started = time.time()
    deadline = started + seconds

    try:
        with open_serial(port, baud, timeout_s) as ser:
            # Flush any partial line.
            try:
                ser.reset_input_buffer()
            except Exception:
                pass

            print(f"Reading from {port} @ {baud} baud for {seconds:.1f}s ...")
            print("Tip: move the GPS near a window for a faster fix.")
            print("")

            while time.time() < deadline and total_lines < max_lines:
                raw = ser.readline()
                if not raw:
                    continue
                try:
                    line = raw.decode("ascii", errors="replace").strip()
                except Exception:
                    line = str(raw)

                total_lines += 1
                last_raw_line = line

                if is_probably_nmea_line(line):
                    ok_nmea += 1
                    if nmea_checksum_ok(line):
                        ok_checksum += 1
                        if len(first_good_lines) < 5:
                            first_good_lines.append(line)

                    fix = parse_nmea_fix(line)
                    if fix and (fix.lat is not None or fix.lon is not None or fix.fix_type is not None):
                        last_fix = fix

                    # Count sentence types ($GPRMC, $GNGGA, etc)
                    star = line.find("*")
                    core = line[1:star] if star != -1 else line[1:]
                    msg = core.split(",", 1)[0].upper()
                    sentence_counts[msg] = sentence_counts.get(msg, 0) + 1

                # Periodic lightweight progress
                if total_lines % 50 == 0:
                    elapsed = time.time() - started
                    print(
                        f"... {elapsed:.1f}s: lines={total_lines}, nmea={ok_nmea}, checksum_ok={ok_checksum}"
                    )

    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as e:
        print(f"Error opening/reading {port} @ {baud}: {e}")
        raise SystemExit(1)

    return {
        "total_lines": total_lines,
        "ok_nmea": ok_nmea,
        "ok_checksum": ok_checksum,
        "sentence_counts": sentence_counts,
        "first_good_lines": first_good_lines,
        "last_fix": last_fix,
        "last_raw_line": last_raw_line,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Simple GPS module test: reads NMEA sentences over serial (USB-UART)."
    )
    parser.add_argument("--list", action="store_true", help="List detected serial ports and exit")
    parser.add_argument("--port", help="Serial port (e.g. COM3)")
    parser.add_argument("--baud", type=int, default=9600, help="Baud rate (default: 9600)")
    parser.add_argument(
        "--scan",
        action="store_true",
        help="Try common baud rates until valid NMEA is found",
    )
    parser.add_argument("--seconds", type=float, default=15.0, help="How long to read (default: 15)")
    parser.add_argument("--timeout", type=float, default=0.5, help="Serial read timeout seconds (default: 0.5)")
    parser.add_argument("--max-lines", type=int, default=2000, help="Safety cap on read lines")
    args = parser.parse_args()

    ports = list_serial_ports()

    if args.list:
        if not ports:
            print("No serial ports detected.")
            return 1
        for p in ports:
            print(f"{p['device']}\t{p.get('description','')}\t{p.get('hwid','')}")
        return 0

    port = args.port or pick_port_interactively(ports)

    baud_candidates = [args.baud]
    if args.scan:
        # Common for GPS modules: 9600 (most), 4800 (some), 115200 (some UBX configs)
        baud_candidates = [4800, 9600, 19200, 38400, 57600, 115200]

    best = None
    for baud in baud_candidates:
        result = run_capture(
            port=port,
            baud=baud,
            seconds=args.seconds,
            timeout_s=args.timeout,
            max_lines=args.max_lines,
        )
        if best is None:
            best = (baud, result)

        if result["ok_nmea"] > 0:
            best = (baud, result)
            break

    baud, result = best
    print("")
    print("=== Summary ===")
    print(f"Port: {port}")
    print(f"Baud: {baud}")
    print(f"Total lines read: {result['total_lines']}")
    print(f"NMEA-looking lines: {result['ok_nmea']}")
    print(f"Checksum-valid NMEA: {result['ok_checksum']}")

    if result["sentence_counts"]:
        top = sorted(result["sentence_counts"].items(), key=lambda kv: kv[1], reverse=True)[:8]
        print("Top sentences:")
        for msg, cnt in top:
            print(f"  {msg}: {cnt}")

    if result["first_good_lines"]:
        print("")
        print("Sample NMEA lines:")
        for l in result["first_good_lines"]:
            print(f"  {l}")

    fix = result["last_fix"]
    if fix and (fix.lat is not None or fix.lon is not None or fix.fix_type is not None or fix.status is not None):
        print("")
        if fix.fix_type is not None:
            print(f"Last GGA fix_type: {fix.fix_type}  sats: {fix.sats}")
        if fix.status is not None:
            print(f"Last RMC status: {fix.status} (A=active, V=void)")
        if fix.lat is not None and fix.lon is not None:
            print(f"Last position: lat={fix.lat:.6f}, lon={fix.lon:.6f}")
        else:
            print("Last position: (not available yet)")
    else:
        print("")
        print("No valid NMEA detected.")
        if result["last_raw_line"]:
            print(f"Last raw line: {result['last_raw_line']}")
        print("")
        print("Troubleshooting checklist:")
        print("  - Confirm the GPS shows up as a COM port in Device Manager → Ports (COM & LPT).")
        print("  - Close any other program using the port (Arduino Serial Monitor, u-center, etc).")
        print("  - Try `--scan` to test common baud rates.")
        print("  - Some modules output binary (UBX) instead of NMEA depending on configuration.")
        print("  - If powered by USB-UART, confirm TX/RX wiring (GPS TX → adapter RX, and vice-versa).")

    return 0 if result["ok_nmea"] > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
