"""Parse NMEA 0183 sentences from u-blox NEO-6M (GPRMC/GNRMC, GPGGA/GNGGA)."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Optional


def _nmea_checksum_ok(sentence: str) -> bool:
    if "*" not in sentence:
        return True
    body, _, rest = sentence.partition("*")
    if len(rest) < 2:
        return False
    try:
        expected = int(rest[:2], 16)
    except ValueError:
        return False
    xor = 0
    for c in body[1:]:  # skip $
        xor ^= ord(c)
    return xor == expected


def _parse_lat(s: str, hemi: str) -> float:
    s, hemi = s.strip(), hemi.strip().upper()
    if not s or len(s) < 4:
        return math.nan
    try:
        deg = int(s[0:2])
        minutes = float(s[2:])
        v = deg + minutes / 60.0
        if hemi == "S":
            v = -v
        return v
    except ValueError:
        return math.nan


def _parse_lon(s: str, hemi: str) -> float:
    s, hemi = s.strip(), hemi.strip().upper()
    if not s or len(s) < 5:
        return math.nan
    try:
        deg = int(s[0:3])
        minutes = float(s[3:])
        v = deg + minutes / 60.0
        if hemi == "W":
            v = -v
        return v
    except ValueError:
        return math.nan


@dataclass
class GpsFix:
    """Latest merged state from RMC/GGA (invalid until has_fix)."""

    latitude: float = math.nan
    longitude: float = math.nan
    altitude_m: Optional[float] = None
    speed_m_s: Optional[float] = None
    track_true_deg: Optional[float] = None
    satellites: Optional[int] = None
    hdop: Optional[float] = None
    fix_quality: Optional[int] = None  # GGA: 0=no fix, 1=GPS, 2=DGPS, ...
    utc_time: Optional[str] = None
    utc_date: Optional[str] = None
    raw_sentence: str = ""

    @property
    def has_fix(self) -> bool:
        return (
            not math.isnan(self.latitude)
            and not math.isnan(self.longitude)
            and self.fix_quality is not None
            and self.fix_quality > 0
        )

    def as_dict(self) -> dict:
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude_m": self.altitude_m,
            "speed_m_s": self.speed_m_s,
            "track_true_deg": self.track_true_deg,
            "satellites": self.satellites,
            "hdop": self.hdop,
            "fix_quality": self.fix_quality,
            "utc_time": self.utc_time,
            "utc_date": self.utc_date,
            "has_fix": self.has_fix,
        }


_RMC_RE = re.compile(r"^\$(G[NP]RMC|GNRMC),")
_GGA_RE = re.compile(r"^\$(G[NP]GGA|GNGGA),")


def parse_nmea_sentence(line: str, current: Optional[GpsFix] = None) -> Optional[GpsFix]:
    """
    Update fix from one NMEA line. Returns a new GpsFix merged with `current`, or None if ignored.
    """
    line = line.strip()
    if not line.startswith("$"):
        return None
    if not _nmea_checksum_ok(line):
        return None

    base = current if current is not None else GpsFix()

    if _RMC_RE.match(line):
        return _merge_rmc(line, base)
    if _GGA_RE.match(line):
        return _merge_gga(line, base)
    return None


def _merge_rmc(line: str, base: GpsFix) -> GpsFix:
    parts = line.split(",")
    # $GPRMC,time,status,lat,N,lon,E,sog,cog,date,...
    if len(parts) < 10:
        return base
    status = parts[2]
    lat_s, lat_h = parts[3], parts[4]
    lon_s, lon_h = parts[5], parts[6]
    sog = parts[7]
    cog = parts[8]
    date = parts[9]

    out = GpsFix(
        latitude=base.latitude,
        longitude=base.longitude,
        altitude_m=base.altitude_m,
        speed_m_s=base.speed_m_s,
        track_true_deg=base.track_true_deg,
        satellites=base.satellites,
        hdop=base.hdop,
        fix_quality=base.fix_quality,
        utc_time=base.utc_time,
        utc_date=base.utc_date,
        raw_sentence=line,
    )
    out.utc_time = parts[1] or base.utc_time
    out.utc_date = date or base.utc_date

    if status == "A":
        lat = _parse_lat(lat_s, lat_h)
        lon = _parse_lon(lon_s, lon_h)
        if not math.isnan(lat):
            out.latitude = lat
        if not math.isnan(lon):
            out.longitude = lon
        if sog:
            try:
                knots = float(sog)
                out.speed_m_s = knots * 0.514444
            except ValueError:
                pass
        if cog:
            try:
                out.track_true_deg = float(cog)
            except ValueError:
                pass
        if out.fix_quality is None:
            out.fix_quality = 1
    return out


def _merge_gga(line: str, base: GpsFix) -> GpsFix:
    parts = line.split(",")
    # $GPGGA,time,lat,N,lon,E,quality,sats,hdop,alt,M,...
    if len(parts) < 10:
        return base
    qual_s, sats_s, hdop_s, alt_s = parts[6], parts[7], parts[8], parts[9]
    lat_s, lat_h = parts[2], parts[3]
    lon_s, lon_h = parts[4], parts[5]

    out = GpsFix(
        latitude=base.latitude,
        longitude=base.longitude,
        altitude_m=base.altitude_m,
        speed_m_s=base.speed_m_s,
        track_true_deg=base.track_true_deg,
        satellites=base.satellites,
        hdop=base.hdop,
        fix_quality=base.fix_quality,
        utc_time=base.utc_time,
        utc_date=base.utc_date,
        raw_sentence=line,
    )
    out.utc_time = parts[1] or base.utc_time

    try:
        out.fix_quality = int(qual_s) if qual_s else 0
    except ValueError:
        out.fix_quality = 0

    if out.fix_quality > 0:
        lat = _parse_lat(lat_s, lat_h)
        lon = _parse_lon(lon_s, lon_h)
        if not math.isnan(lat):
            out.latitude = lat
        if not math.isnan(lon):
            out.longitude = lon

    if sats_s:
        try:
            out.satellites = int(sats_s)
        except ValueError:
            pass
    if hdop_s:
        try:
            out.hdop = float(hdop_s)
        except ValueError:
            pass
    if alt_s:
        try:
            out.altitude_m = float(alt_s)
        except ValueError:
            pass
    return out
