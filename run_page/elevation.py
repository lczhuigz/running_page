"""Small elevation-gain helpers shared by GPX import and app sync adapters."""

from __future__ import annotations

import os
from collections.abc import Iterable
from typing import Protocol


class GPXWithTracks(Protocol):
    tracks: Iterable[object]


class GPXTrack(Protocol):
    segments: Iterable[object]


class GPXSegment(Protocol):
    points: Iterable[object]


class GPXPoint(Protocol):
    elevation: float | None


def _as_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def elevations_from_gpx(gpx: GPXWithTracks) -> list[float]:
    values: list[float] = []
    for track in gpx.tracks:
        for segment in track.segments:  # type: ignore[attr-defined]
            for point in segment.points:  # type: ignore[attr-defined]
                elevation = _as_float(point.elevation)  # type: ignore[attr-defined]
                if elevation is not None:
                    values.append(elevation)
    return values


def smooth_elevations(values: list[float], window: int) -> list[float]:
    if not values:
        return []
    if len(values) == 1:
        return values

    window = max(3, window)
    if window % 2 == 0:
        window += 1
    if window >= len(values):
        window = len(values) if len(values) % 2 else len(values) - 1
    if window < 3:
        return values

    half = window // 2
    result: list[float] = []
    for index, _ in enumerate(values):
        start = max(0, index - half)
        end = min(len(values), index + half + 1)
        result.append(sum(values[start:end]) / (end - start))
    return result


def elevation_gain_from_values(
    values: list[float],
    *,
    smooth_window: int | None = None,
    min_climb: float | None = None,
) -> float:
    smooth_window = smooth_window or int(
        os.getenv("ELEVATION_SMOOTH_WINDOW", "5")
    )
    min_climb = min_climb or float(os.getenv("ELEVATION_MIN_CLIMB", "0.5"))
    if len(values) < 2:
        return 0.0

    smoothed = smooth_elevations(values, smooth_window)
    gain = 0.0
    for previous, current in zip(smoothed, smoothed[1:]):
        climb = current - previous
        if climb >= min_climb:
            gain += climb
    return gain


def elevation_gain_from_gpx(gpx: GPXWithTracks) -> float:
    return elevation_gain_from_values(elevations_from_gpx(gpx))
