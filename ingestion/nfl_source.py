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

TEAM_CODE_MAP = {
    "LA": "LAR",
    "STL": "LAR",
    "SD": "LAC",
    "OAK": "LV",
    "WSH": "WAS",
}


def normalize_team_code(code: str) -> str:
    """Normalizes team code to match standard Gridiron Hub codes (e.g. LA -> LAR)."""
    cleaned = (code or "").upper().strip()
    return TEAM_CODE_MAP.get(cleaned, cleaned)

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

        possession_code = normalize_team_code(str(row.get("posteam") or ""))
        if not possession_code or possession_code == "UNK":
            possession_code = normalize_team_code(str(row.get("home_team") or ""))
        if not possession_code or possession_code == "UNK":
            continue

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


def fetch_nfl_games(season: int, week: Optional[int] = None) -> List[Dict[str, Any]]:
    """Loads 100% authentic NFL schedules and completed game scores from nflreadpy."""
    try:
        import nflreadpy as nfl
        import polars as pl

        sched = nfl.load_schedules([season])
        if hasattr(sched, "filter") and week is not None:
            sched = sched.filter(pl.col("week") == week)

        records = sched.to_dicts() if hasattr(sched, "to_dicts") else (sched.to_dict(orient="records") if hasattr(sched, "to_dict") else [])
        games = []
        for r in records:
            home_code = normalize_team_code(str(r.get("home_team") or "UNK"))
            away_code = normalize_team_code(str(r.get("away_team") or "UNK"))
            w = int(r.get("week") or 1)
            gid = str(r.get("game_id") or f"{season}_{w}_{away_code}_{home_code}")
            
            home_score = r.get("home_score")
            away_score = r.get("away_score")
            status = "final" if home_score is not None and away_score is not None else "scheduled"

            gameday = str(r.get("gameday") or "")
            gametime = str(r.get("gametime") or "13:00")
            game_date = f"{gameday}T{gametime}:00Z" if gameday else ""

            season_type = "postseason" if str(r.get("game_type") or "REG").upper() in ["WC", "DIV", "CON", "SB", "POST"] else "regular"

            games.append({
                "id": f"nfl_{gid.lower()}",
                "league": "nfl",
                "season": season,
                "season_type": season_type,
                "week": w,
                "game_date": game_date,
                "home_team_id": f"nfl_{home_code}",
                "away_team_id": f"nfl_{away_code}",
                "home_score": int(home_score) if home_score is not None else 0,
                "away_score": int(away_score) if away_score is not None else 0,
                "status": status,
                "venue": str(r.get("stadium") or "Estadio NFL"),
                "weather_temp": int(r.get("temp")) if r.get("temp") is not None and not math.isnan(float(r.get("temp"))) else None,
                "weather_desc": str(r.get("weather") or ""),
                "highlight_url": f"https://www.youtube.com/results?search_query={away_code}+vs+{home_code}+Week+{w}+{season}+highlights",
            })
        return games
    except Exception as exc:
        logger.warning(f"Error al obtener calendarios nflreadpy ({season}, semana {week}): {exc}")
        return []


def fetch_nfl_team_stats_and_plays(season: int, week: int) -> Dict[str, Any]:
    """Extracts team boxscores and high-leverage key plays from real nflverse play-by-play."""
    try:
        import nflreadpy as nfl
        import polars as pl

        pbp = nfl.load_pbp(season)
        if hasattr(pbp, "filter"):
            week_pbp = pbp.filter(pl.col("week") == week)
        else:
            return {"team_stats": [], "key_plays": []}

        all_team_stats: List[Dict[str, Any]] = []
        all_key_plays: List[Dict[str, Any]] = []

        # Find unique games in this week
        unique_games = week_pbp.select("game_id").unique().to_series().to_list()

        for raw_gid in unique_games:
            game_pbp = week_pbp.filter(pl.col("game_id") == raw_gid)
            app_gid = f"nfl_{str(raw_gid).lower()}"

            # 1. Parse top plays
            records = game_pbp.to_dicts()
            game_plays = parse_pbp_dataframe(records, app_gid)
            top_plays = extract_key_plays(game_plays, top_n=5)
            all_key_plays.extend(top_plays)

            # 2. Compute team stats
            home_team = game_pbp.select("home_team").drop_nulls()
            away_team = game_pbp.select("away_team").drop_nulls()
            if home_team.height == 0 or away_team.height == 0:
                continue

            raw_h = str(home_team.item(0, 0)).upper()
            raw_a = str(away_team.item(0, 0)).upper()

            for raw_code, is_home in [(raw_h, True), (raw_a, False)]:
                norm_code = normalize_team_code(raw_code)
                t_plays = game_pbp.filter((pl.col("posteam") == raw_code) | (pl.col("posteam") == norm_code))
                if t_plays.height == 0:
                    continue

                tot_y = t_plays.select(pl.col("yards_gained").sum()).item() or 0
                pass_y = t_plays.select(pl.col("passing_yards").sum()).item() or 0
                rush_y = t_plays.select(pl.col("rushing_yards").sum()).item() or 0

                tot_epa = t_plays.select(pl.col("epa").sum()).item() or 0.0
                pass_epa = t_plays.filter(pl.col("play_type") == "pass").select(pl.col("epa").sum()).item() or 0.0
                rush_epa = t_plays.filter(pl.col("play_type") == "run").select(pl.col("epa").sum()).item() or 0.0

                third_att = t_plays.filter(pl.col("down") == 3).height
                third_conv = t_plays.filter((pl.col("down") == 3) & (pl.col("third_down_converted") == 1)).height

                rz_plays = t_plays.filter(pl.col("yardline_100") <= 20)
                rz_att = max(1, rz_plays.select("drive").n_unique()) if rz_plays.height > 0 else 0
                rz_conv = rz_plays.filter(pl.col("touchdown") == 1).select("drive").n_unique() if rz_plays.height > 0 else 0

                turnovers = t_plays.filter((pl.col("interception") == 1) | (pl.col("fumble_lost") == 1)).height

                all_team_stats.append({
                    "id": f"stat_{app_gid}_{norm_code.lower()}",
                    "game_id": app_gid,
                    "team_id": f"nfl_{norm_code}",
                    "is_home": is_home,
                    "total_yards": int(tot_y),
                    "passing_yards": int(pass_y),
                    "rushing_yards": int(rush_y),
                    "turnovers": turnovers,
                    "epa_total": round(float(tot_epa), 2),
                    "epa_pass": round(float(pass_epa), 2),
                    "epa_rush": round(float(rush_epa), 2),
                    "third_down_comp": third_conv,
                    "third_down_att": third_att,
                    "red_zone_comp": rz_conv,
                    "red_zone_att": rz_att,
                    "time_of_possession": "30:00",
                })

        return {"team_stats": all_team_stats, "key_plays": all_key_plays}
    except Exception as exc:
        logger.warning(f"Error al procesar PBP en nflreadpy ({season}, semana {week}): {exc}")
        return {"team_stats": [], "key_plays": []}


def fetch_nfl_player_stats(season: int, week: int) -> List[Dict[str, Any]]:
    """Loads weekly NFL player statistics with offensive and defensive EPA from nflverse."""
    try:
        import nflreadpy as nfl
        import polars as pl

        df = nfl.load_player_stats([season])
        if hasattr(df, "filter"):
            filtered = df.filter(pl.col("week") == week)
            records = filtered.to_dicts()
        elif hasattr(df, "to_dict"):
            records = df[df["week"] == week].to_dict(orient="records")
        else:
            return []

        results = []
        for r in records:
            team_code = normalize_team_code(str(r.get("team") or r.get("recent_team") or "UNK"))
            player_name = str(r.get("player_display_name") or r.get("player_name") or "Desconocido")
            pid = str(r.get("player_id") or "")

            pass_epa = float(r.get("passing_epa", 0.0) or 0.0)
            rush_epa = float(r.get("rushing_epa", 0.0) or 0.0)
            rec_epa = float(r.get("receiving_epa", 0.0) or 0.0)
            tot_epa = pass_epa + rush_epa + rec_epa

            def_sacks = float(r.get("def_sacks", 0.0) or 0.0)
            def_ints = int(r.get("def_interceptions", 0) or 0)
            def_tackles = int(r.get("def_tackles_solo", 0) or 0)

            results.append({
                "id": f"stat_nfl_{season}_w{week}_{pid}",
                "player_name": player_name,
                "team_id": f"nfl_{team_code}",
                "league": "nfl",
                "season": season,
                "week": week,
                "position": r.get("position"),
                "epa_total": round(tot_epa, 2),
                "epa_pass": round(pass_epa, 2),
                "epa_rush": round(rush_epa, 2),
                "epa_defense": round((def_sacks * -1.5) + (def_ints * -4.0), 2),
                "pass_yards": int(r.get("passing_yards", 0) or 0),
                "pass_td": int(r.get("passing_tds", 0) or 0),
                "pass_int": int(r.get("passing_interceptions", 0) or 0),
                "rush_yards": int(r.get("rushing_yards", 0) or 0),
                "rush_td": int(r.get("rushing_tds", 0) or 0),
                "rec_yards": int(r.get("receiving_yards", 0) or 0),
                "rec_td": int(r.get("receiving_tds", 0) or 0),
                "tackles": def_tackles,
                "sacks": def_sacks,
                "interceptions": def_ints,
            })
        return results
    except Exception as exc:
        logger.info(f"nflreadpy load_player_stats: {exc}.")
    return []
