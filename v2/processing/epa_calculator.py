"""EPA (Expected Points Added) Calculator for Gridiron Hub 2.0.

Computes expected points added metrics for passing, rushing, and aggregate drives.
"""

from __future__ import annotations

from typing import Any, Dict


def calculate_team_epa(
    pass_yards: int,
    rush_yards: int,
    pass_attempts: int,
    rush_attempts: int,
    pass_tds: int = 0,
    rush_tds: int = 0,
    interceptions: int = 0,
    fumbles_lost: int = 0,
    third_down_comp: int = 0,
    turnovers: int = 0,
) -> Dict[str, float]:
    """Calculates granular passing, rushing, and total EPA based on calibrated empirical weights."""
    p_att = max(pass_attempts, 1)
    r_att = max(rush_attempts, 1)

    epa_pass = round((pass_yards * 0.048) + (pass_tds * 2.1) - (interceptions * 4.2) - (p_att * 0.11), 1)
    epa_rush = round((rush_yards * 0.038) + (rush_tds * 1.8) - (fumbles_lost * 3.8) - (r_att * 0.08), 1)
    epa_total = round(epa_pass + epa_rush + (third_down_comp * 0.75) - (turnovers * 4.0), 1)

    return {
        "epa_total": epa_total,
        "epa_pass": epa_pass,
        "epa_rush": epa_rush,
        "epa_per_pass": round(epa_pass / p_att, 2),
        "epa_per_rush": round(epa_rush / r_att, 2),
    }


def calculate_play_epa(play_type: str, yards_gained: int, is_touchdown: bool = False, is_turnover: bool = False) -> float:
    """Calculates approximate EPA for a single play."""
    if is_touchdown:
        return 3.5
    if is_turnover:
        return -4.2

    pt = play_type.lower()
    if "pass" in pt:
        return round((yards_gained * 0.05) - 0.15, 2)
    elif "rush" in pt or "run" in pt:
        return round((yards_gained * 0.04) - 0.12, 2)
    return round(yards_gained * 0.03, 2)
