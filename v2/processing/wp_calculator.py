"""Win Probability Calculator and Key Plays Selector for Gridiron Hub 2.0."""

from __future__ import annotations

from typing import Any, Dict, List


def calculate_wp_swing(wp_before: float, wp_after: float) -> float:
    """Calculates absolute win probability swing of a play."""
    return round(abs(wp_after - wp_before), 2)


def rank_top_plays(plays: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
    """Ranks plays by win probability swing descending and EPA impact."""
    return sorted(plays, key=lambda p: (p.get("wp_swing", 0.0), abs(p.get("epa", 0.0))), reverse=True)[:top_n]

