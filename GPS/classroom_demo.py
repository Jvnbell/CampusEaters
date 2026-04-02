import argparse
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

# Reuse your existing serial + NMEA helpers.
from test_gps import (  # type: ignore
    is_probably_nmea_line,
    nmea_checksum_ok,
    open_serial,
    parse_nmea_fix,
)


@dataclass
class SNRStats:
    sats_in_view: int = 0  # from GSV field "total satellites in view"
    snr_values: Tuple[int, ...] = ()
    last_gsv_t: Optional[float] = None

    @property
    def snr_avg(self) -> Optional[float]:
        if not self.snr_values:
            return None
        return sum(self.snr_values) / len(self.snr_values)

    @property
    def snr_max(self) -> Optional[int]:
        if not self.snr_values:
            return None
        return max(self.snr_values)


def _parse_gsv(line: str) -> Optional[Tuple[int, Tuple[int, ...]]]:
    """
    Parse $--GSV.
    Example: $GPGSV,3,1,12,02,62,172,44,05,54,020,41,...*hh
    Fields: total_msgs, msg_num, sats_in_view, then repeating (PRN,elev,az,SNR)
    """
    line = line.strip()
    if not line.startswith("$"):
        return None
    star = line.rfind("*")
    core = line[1:star] if star != -1 else line[1:]
    parts = core.split(",")
    if not parts:
        return None
    msg_type = parts[0].upper()[-3:]
    if msg_type != "GSV":
        return None
    if len(parts) < 4:
        return None

    try:
        sats_in_view = int(parts[3]) if parts[3] else 0
    except Exception:
        sats_in_view = 0

    snrs = []
    # starting at index 4, groups of 4: prn, elev, az, snr
    for i in range(4, len(parts), 4):
        if i + 3 >= len(parts):
            break
        snr_s = parts[i + 3]
        if not snr_s:
            continue
        try:
            snr = int(snr_s)
        except Exception:
            continue
        if 0 <= snr <= 99:
            snrs.append(snr)

    return sats_in_view, tuple(snrs)


def _bar(value: Optional[float], max_value: float = 50.0, width: int = 20) -> str:
    if value is None:
        return "[" + (" " * width) + "]"
    v = max(0.0, min(max_value, float(value)))
    filled = int(round((v / max_value) * width))
    return "[" + ("#" * filled) + (" " * (width - filled)) + "]"


def main() -> int:
    p = argparse.ArgumentParser(
        description="Classroom GNSS demo: shows live satellite SNR + fix status (clear evidence indoors)."
    )
    p.add_argument("--port", required=True, help="Serial port (e.g. /dev/cu.usbmodem11401, COM3)")
    p.add_argument("--baud", type=int, default=9600, help="Baud rate (default: 9600)")
    p.add_argument("--timeout", type=float, default=0.5, help="Serial read timeout seconds (default: 0.5)")
    p.add_argument("--redraw", type=float, default=0.25, help="Redraw interval seconds (default: 0.25)")
    args = p.parse_args()

    # Latest states
    last_fix_type: Optional[int] = None
    last_sats_used: Optional[int] = None
    last_rmc_status: Optional[str] = None  # A/V
    last_latlon: Optional[Tuple[float, float]] = None
    last_fix_t: Optional[float] = None

    gsv = SNRStats()
    nmea_ok = 0
    bad_cs = 0

    # For “clear evidence”: show that signal changes in the room.
    # Track last 10 avg-SNR readings and show a delta.
    snr_history: Dict[int, float] = {}
    hist_idx = 0

    print(f"Demo reading from {args.port} @ {args.baud} baud. Ctrl-C to stop.")
    print("Try this in class: move near a window, then cover the antenna with your hand.")
    print("")

    next_draw = 0.0
    try:
        with open_serial(args.port, args.baud, args.timeout) as ser:
            try:
                ser.reset_input_buffer()
            except Exception:
                pass

            while True:
                raw = ser.readline()
                if raw:
                    try:
                        line = raw.decode("ascii", errors="replace").strip()
                    except Exception:
                        line = ""

                    if line and is_probably_nmea_line(line):
                        if not nmea_checksum_ok(line):
                            bad_cs += 1
                        else:
                            nmea_ok += 1

                            gsv_parsed = _parse_gsv(line)
                            if gsv_parsed is not None:
                                sats_in_view, snrs = gsv_parsed
                                gsv.sats_in_view = sats_in_view
                                if snrs:
                                    # Keep only the latest packet's SNR list; good enough for demo.
                                    gsv.snr_values = snrs
                                gsv.last_gsv_t = time.time()

                            fix = parse_nmea_fix(line)
                            if fix is not None:
                                if fix.fix_type is not None:
                                    last_fix_type = fix.fix_type
                                if fix.sats is not None:
                                    last_sats_used = fix.sats
                                if fix.status is not None:
                                    last_rmc_status = fix.status
                                if fix.lat is not None and fix.lon is not None:
                                    last_latlon = (fix.lat, fix.lon)
                                last_fix_t = time.time()

                now = time.time()
                if now < next_draw:
                    continue
                next_draw = now + args.redraw

                snr_avg = gsv.snr_avg
                snr_max = gsv.snr_max

                if snr_avg is not None:
                    snr_history[hist_idx % 10] = snr_avg
                    hist_idx += 1

                snr_delta = None
                if len(snr_history) >= 2:
                    # Compare current to oldest stored
                    oldest = snr_history.get((hist_idx - 1) % 10)
                    newest = snr_avg
                    if oldest is not None and newest is not None:
                        snr_delta = newest - oldest

                age_gsv = None if gsv.last_gsv_t is None else (now - gsv.last_gsv_t)
                age_fix = None if last_fix_t is None else (now - last_fix_t)

                fix_type_s = "-" if last_fix_type is None else str(last_fix_type)
                sats_used_s = "-" if last_sats_used is None else str(last_sats_used)
                rmc_s = "-" if last_rmc_status is None else last_rmc_status
                pos_s = "-"
                if last_latlon is not None:
                    pos_s = f"{last_latlon[0]:.6f},{last_latlon[1]:.6f}"

                snr_avg_s = "-" if snr_avg is None else f"{snr_avg:0.1f}"
                snr_max_s = "-" if snr_max is None else f"{snr_max:d}"
                delta_s = "-" if snr_delta is None else f"{snr_delta:+0.1f}"
                age_gsv_s = "-" if age_gsv is None else f"{age_gsv:0.1f}s"
                age_fix_s = "-" if age_fix is None else f"{age_fix:0.1f}s"

                line_out = (
                    f"Sats in view: {gsv.sats_in_view:2d}  "
                    f"SNR avg/max: {snr_avg_s:>5}/{snr_max_s:>2}  "
                    f"{_bar(snr_avg)}  "
                    f"ΔSNR(rolling): {delta_s:>6}  "
                    f"Fix(GGA): {fix_type_s:>2}  used: {sats_used_s:>2}  "
                    f"RMC: {rmc_s}  "
                    f"pos: {pos_s}  "
                    f"age(gsv/fix): {age_gsv_s}/{age_fix_s}  "
                    f"ok/badCS: {nmea_ok}/{bad_cs}"
                )
                print("\r" + line_out + " " * 10, end="", flush=True)

    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

