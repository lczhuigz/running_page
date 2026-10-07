import importlib
from pathlib import Path

import pytest


@pytest.fixture
def elevation(monkeypatch):
    monkeypatch.syspath_prepend(str(Path(__file__).parent / "run_page"))
    return importlib.import_module("elevation")


def test_elevation_gain_ignores_small_gps_jitter(elevation):
    values = [10, 10.2, 10.1, 10.4, 11, 10.8, 12]
    gain = elevation.elevation_gain_from_values(
        values, smooth_window=3, min_climb=0.5
    )
    assert 0 <= gain < sum(max(0, b - a) for a, b in zip(values, values[1:]))


def test_elevation_gain_counts_real_climbs(elevation):
    values = [10, 10, 11, 12, 13, 12, 14, 15]
    gain = elevation.elevation_gain_from_values(
        values, smooth_window=3, min_climb=0.1
    )
    assert gain == pytest.approx(4.5, abs=0.1)
