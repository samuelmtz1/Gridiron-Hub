"""NFL Data Ingestion Wrapper for Gridiron Hub.

Wraps nflreadpy / nflverse ecosystem data (load_pbp, load_player_stats).
Extracts Expected Points Added (EPA), Win Probability (WP), and play-by-play.
Caches locally on disk via NFLREADPY_CACHE=filesystem.
Cost: $0 perpetual (Public GitHub repos, unlimited requests).
"""

from __future__ import annotations

import logging
import math
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Ensure local cache path is active
os.environ.setdefault("NFLREADPY_CACHE", "filesystem")


def compute_wp_swing(wp_before: Optional[float], wp_after: Optional[float]) -> float:
    """Calculates absolute Win Probability swing between plays."""
    if wp_before is None or wp_after is None:
        return 0.0
    return round(abs(wp_after - wp_before), 4)


def extract_key_plays(plays: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
    """Filters and ranks high-leverage plays in a game by WP swing and absolute EPA."""
    scored_plays = []
    for play in plays:
        wp_swing = play.get("wp_swing")
        if wp_swing is None:
            wp_before = play.get("wp_before")
            wp_after = play.get("wp_after")
            wp_swing = compute_wp_swing(wp_before, wp_after)
            play["wp_swing"] = wp_swing

        epa = play.get("epa", 0.0) or 0.0
        # Leverage score combines WP swing and EPA magnitude
        leverage_score = (wp_swing * 10.0) + (abs(epa) * 0.5)
        scored_plays.append((leverage_score, play))

    scored_plays.sort(key=lambda x: x[0], reverse=True)
    return [p[1] for p in scored_plays[:top_n]]


def parse_pbp_dataframe(df_records: List[Dict[str, Any]], game_id: str) -> List[Dict[str, Any]]:
    """Normalizes raw nflverse play-by-play dictionary rows into Gridiron Hub key_plays schema."""
    normalized_plays: List[Dict[str, Any]] = []

    for row in df_records:
        play_id = str(row.get("play_id") or row.get("id") or "")
        desc = row.get("desc") or row.get("description") or ""
        if not desc or row.get("play_type") in ["no_play", "timeout"]:
            continue

        wp_before = float(row.get("home_wp") or row.get("wp") or 0.5)
        # Approximate or get wp_after if column exists, else estimate swing
        wp_after = float(row.get("home_wp_post") or row.get("wp_after") or wp_before)
        wp_swing = compute_wp_swing(wp_before, wp_after)
        epa = float(row.get("epa") or 0.0)

        # Flag significant moments
        is_td = 1 if (row.get("touchdown") == 1 or "TOUCHDOWN" in desc.upper()) else 0
        is_turnover = 1 if (row.get("interception") == 1 or row.get("fumble_lost") == 1) else 0

        possession_code = str(row.get("posteam") or "UNK").upper()

        normalized_plays.append({
            "id": f"play_{game_id}_{play_id}",
            "game_id": game_id,
            "play_id": play_id,
            "quarter": int(row.get("qtr") or 1),
            "time_remaining": str(row.get("time") or row.get("quarter_seconds_remaining") or "00:00"),
            "down": int(row.get("down")) if row.get("down") and not math.isnan(float(row.get("down"))) else None,
            "ydstogo": int(row.get("ydstogo")) if row.get("ydstogo") and not math.isnan(float(row.get("ydstogo"))) else None,
            "yardline": str(row.get("yrdln") or ""),
            "possession_team_id": f"nfl_{possession_code}",
            "play_type": str(row.get("play_type") or "pass"),
            "description": desc,
            "epa": round(epa, 2),
            "wp_before": round(wp_before, 3),
            "wp_after": round(wp_after, 3),
            "wp_swing": round(wp_swing, 3),
            "is_turnover": is_turnover,
            "is_touchdown": is_td,
            "highlight_timestamp": None,
        })

    return normalized_plays


def fetch_nfl_player_stats(season: int, week: int) -> List[Dict[str, Any]]:
    """Loads weekly NFL player statistics with offensive and defensive EPA."""
    try:
        import nflreadpy as nfl
        df = nfl.load_player_stats([season])
        # Filter for the specific week if DataFrame is available
        if hasattr(df, "to_dict"):
            filtered = df[df["week"] == week]
            records = filtered.to_dict(orient="records")
            results = []
            for r in records:
                results.append({
                    "id": f"stat_nfl_{season}_w{week}_{r.get('player_id')}",
                    "player_name": r.get("player_display_name") or r.get("player_name"),
                    "team_id": f"nfl_{str(r.get('recent_team')).upper()}",
                    "league": "nfl",
                    "season": season,
                    "week": week,
                    "position": r.get("position"),
                    "epa_total": float(r.get("passing_epa", 0.0) or 0.0) + float(r.get("rushing_epa", 0.0) or 0.0),
                    "epa_pass": float(r.get("passing_epa", 0.0) or 0.0),
                    "epa_rush": float(r.get("rushing_epa", 0.0) or 0.0),
                    "epa_defense": 0.0,
                    "pass_yards": int(r.get("passing_yards", 0) or 0),
                    "pass_td": int(r.get("passing_tds", 0) or 0),
                    "pass_int": int(r.get("interceptions", 0) or 0),
                    "rush_yards": int(r.get("rushing_yards", 0) or 0),
                    "rush_td": int(r.get("rushing_tds", 0) or 0),
                    "rec_yards": int(r.get("receiving_yards", 0) or 0),
                    "rec_td": int(r.get("receiving_tds", 0) or 0),
                    "tackles": 0,
                    "sacks": 0.0,
                    "interceptions": 0,
                })
            return results
    except Exception as exc:
        logger.info(f"nflreadpy no disponible o sin conexión directa: {exc}. Usando fallback.")
    return []
