from __future__ import annotations

from typing import TYPE_CHECKING

from .geo import bearing_deg, haversine_m
from .nmea import GpsFix, parse_nmea_sentence

if TYPE_CHECKING:
    from .reader import GpsReader

__all__ = [
    "GpsReader",
    "GpsFix",
    "parse_nmea_sentence",
    "haversine_m",
    "bearing_deg",
]


def __getattr__(name: str):
    if name == "GpsReader":
        from .reader import GpsReader

        return GpsReader
    raise AttributeError(name)
