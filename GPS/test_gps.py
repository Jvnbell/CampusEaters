import argparse
import sys
import time
from dataclasses import dataclass
from typing import Optional


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
    lat: Optional[float] = None
    lon: Optional[float] = None
    fix_type: Optional[int] = None  # GGA: 0 invalid, 1 GPS fix, 2 DGPS, ...
    sats: Optional[int] = None
    hdop: Optional[float] = None  # GGA
    altitude_m: Optional[float] = None  # GGA (MSL)
    speed_knots: Optional[float] = None  # RMC
    status: Optional[str] = None  # RMC: A/V
    mode: Optional[str] = None  # RMC (NMEA 2.3+) or GSA: A/M
    pdop: Optional[float] = None  # GSA
    vdop: Optional[float] = None  # GSA
    hdop_gsa: Optional[float] = None  # GSA


def parse_nmea_fix(line: str) -> Optional[FixInfo]:
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
        # GGA fields (common): hdop at index 8, altitude at index 9
        hdop = None
        altitude_m = None
        if len(parts) >= 10:
            try:
                hdop = float(parts[8]) if parts[8] else None
            except Exception:
                hdop = None
            try:
                altitude_m = float(parts[9]) if parts[9] else None
            except Exception:
                altitude_m = None
        return FixInfo(lat=lat, lon=lon, fix_type=fix_type, sats=sats, hdop=hdop, altitude_m=altitude_m)

    # $--RMC: time, status(A/V), lat, N/S, lon, E/W, speed(knots), ...
    if msg_type == "RMC" and len(parts) >= 8:
        status = parts[2].upper() if parts[2] else None
        lat = _dm_to_decimal(parts[3], parts[4])
        lon = _dm_to_decimal(parts[5], parts[6])
        try:
            speed_knots = float(parts[7]) if parts[7] else None
        except Exception:
            speed_knots = None
        # NMEA 2.3+ often includes mode indicator near the end (A/D/E/N/S)
        mode = None
        if len(parts) >= 13 and parts[12]:
            mode = parts[12].upper()
        elif len(parts) >= 14 and parts[13]:
            mode = parts[13].upper()
        return FixInfo(lat=lat, lon=lon, speed_knots=speed_knots, status=status, mode=mode)

    # $--GSA: opMode(A/M), navMode(1/2/3), sat1..sat12, PDOP, HDOP, VDOP
    if msg_type == "GSA" and len(parts) >= 17:
        mode = parts[1].upper() if parts[1] else None
        pdop = hdop = vdop = None
        try:
            pdop = float(parts[15]) if parts[15] else None
        except Exception:
            pdop = None
        try:
            hdop = float(parts[16]) if parts[16] else None
        except Exception:
            hdop = None
        try:
            vdop = float(parts[17]) if len(parts) >= 18 and parts[17] else None
        except Exception:
            vdop = None
        return FixInfo(mode=mode, pdop=pdop, hdop_gsa=hdop, vdop=vdop)

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
    last_fix: Optional[FixInfo] = None
    sentence_counts: dict[str, int] = {}
    first_good_lines: list[str] = []
    last_raw_line: Optional[str] = None
    last_gga_line: Optional[str] = None
    last_rmc_line: Optional[str] = None
    last_gsa_line: Optional[str] = None

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

                    # Keep last key sentences for troubleshooting
                    star = line.find("*")
                    core = line[1:star] if star != -1 else line[1:]
                    msg = core.split(",", 1)[0].upper()
                    msg_type = msg[-3:]
                    if msg_type == "GGA":
                        last_gga_line = line
                    elif msg_type == "RMC":
                        last_rmc_line = line
                    elif msg_type == "GSA":
                        last_gsa_line = line

                    fix = parse_nmea_fix(line)
                    if fix and (fix.lat is not None or fix.lon is not None or fix.fix_type is not None):
                        last_fix = fix

                    # Count sentence types ($GPRMC, $GNGGA, etc)
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
        "last_gga_line": last_gga_line,
        "last_rmc_line": last_rmc_line,
        "last_gsa_line": last_gsa_line,
    }


def run_coords(port: str, baud: int, timeout_s: float, *, once: bool) -> int:
    """
    Stream until we have a valid fix with lat/lon.
    - once=True prints the first coordinate and exits.
    - once=False prints updates as the position changes.
    """
    last_latlon = None
    last_print_t = 0.0

    try:
        with open_serial(port, baud, timeout_s) as ser:
            try:
                ser.reset_input_buffer()
            except Exception:
                pass

            print(f"Waiting for coordinates from {port} @ {baud} baud... (Ctrl-C to stop)")
            while True:
                raw = ser.readline()
                if not raw:
                    continue
                try:
                    line = raw.decode("ascii", errors="replace").strip()
                except Exception:
                    continue

                if not is_probably_nmea_line(line) or not nmea_checksum_ok(line):
                    continue

                fix = parse_nmea_fix(line)
                if fix is None:
                    continue

                has_fix = False
                if fix.fix_type is not None and fix.fix_type >= 1:
                    has_fix = True
                if fix.status is not None and fix.status.upper() == "A":
                    has_fix = True

                if not has_fix or fix.lat is None or fix.lon is None:
                    continue

                latlon = (round(fix.lat, 6), round(fix.lon, 6))
                now = time.time()

                # Print on change, but also at most ~2Hz to be readable
                if latlon != last_latlon and (now - last_print_t) >= 0.2:
                    sats = "-" if fix.sats is None else str(fix.sats)
                    hdop = "-" if fix.hdop is None else f"{fix.hdop:.2f}"
                    ft = "-" if fix.fix_type is None else str(fix.fix_type)
                    rmc = "-" if fix.status is None else fix.status
                    print(f"{latlon[0]},{latlon[1]}  (fix={ft} sats={sats} hdop={hdop} rmc={rmc})")
                    last_latlon = latlon
                    last_print_t = now
                    if once:
                        return 0

    except KeyboardInterrupt:
        print("\nStopped.")
        return 1


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
    parser.add_argument("--coords", action="store_true", help="Print coordinates when available (waits for a fix)")
    parser.add_argument("--once", action="store_true", help="With --coords: print first coordinate then exit")
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

    if args.coords:
        return run_coords(port=port, baud=args.baud, timeout_s=args.timeout, once=args.once)

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
            if fix.hdop is not None:
                print(f"Last GGA HDOP: {fix.hdop}")
            if fix.altitude_m is not None:
                print(f"Last GGA altitude: {fix.altitude_m} m")
        if fix.status is not None:
            print(f"Last RMC status: {fix.status} (A=active, V=void)")
            if fix.mode is not None:
                print(f"Last RMC mode: {fix.mode}")
        if fix.pdop is not None or fix.hdop_gsa is not None or fix.vdop is not None:
            print(
                "Last GSA DOP: "
                + "  ".join(
                    [
                        f"PDOP={fix.pdop}" if fix.pdop is not None else "",
                        f"HDOP={fix.hdop_gsa}" if fix.hdop_gsa is not None else "",
                        f"VDOP={fix.vdop}" if fix.vdop is not None else "",
                    ]
                ).strip()
            )
        if fix.lat is not None and fix.lon is not None:
            print(f"Last position: lat={fix.lat:.6f}, lon={fix.lon:.6f}")
        else:
            print("Last position: (not available yet)")

        # Extra raw context when we're stuck at "no fix"
        if fix.fix_type == 0:
            print("")
            print("Troubleshooting context (last raw sentences):")
            if result.get("last_gga_line"):
                print(f"  last GGA: {result['last_gga_line']}")
            if result.get("last_rmc_line"):
                print(f"  last RMC: {result['last_rmc_line']}")
            if result.get("last_gsa_line"):
                print(f"  last GSA: {result['last_gsa_line']}")
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
