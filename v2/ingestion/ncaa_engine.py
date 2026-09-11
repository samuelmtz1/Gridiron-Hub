"""NCAA Engine for Gridiron Hub 2.0.

Manages NCAA Football schedule ingestion, conference assignment,
scoreboard triggers, and game summaries.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pathlib import Path

from .assets_engine import NCAA_TEAMS, NCAA_CONFERENCES
from .espn_client import (
    fetch_espn_scoreboard,
    fetch_espn_game_summary,
    extract_teams_from_scoreboard,
)
from v2.storage import db

logger = logging.getLogger(__name__)


def ingest_ncaa_week(
    season: int = 2026,
    week: int = 1,
    custom_db_path: Optional[str | Path] = None,
    fetch_summaries: bool = False,
) -> Dict[str, Any]:
    """Ingests NCAA FBS games for a specific season and week from ESPN."""
    db.save_teams(NCAA_TEAMS, custom_path=custom_db_path)

    scoreboard = fetch_espn_scoreboard(league="ncaa", season=season, week=week)
    events = scoreboard.get("events", [])
    if not events:
        logger.info(f"No se obtuvieron eventos en vivo de ESPN para NCAA {season} w{week}.")
        return {"games_count": 0, "status": "no_data"}

    teams = extract_teams_from_scoreboard(scoreboard, league="ncaa")
    if teams:
        db.save_teams(teams, custom_path=custom_db_path)

    games_to_save: List[Dict[str, Any]] = []

    for event in events:
        eid = event.get("id")
        competitions = event.get("competitions", [])
        if not competitions:
            continue
        comp = competitions[0]
        competitors = comp.get("competitors", [])
        if len(competitors) < 2:
            continue

        home_comp = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
        away_comp = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

        h_code = (home_comp.get("team", {}).get("abbreviation") or "").upper().replace("&", "")
        a_code = (away_comp.get("team", {}).get("abbreviation") or "").upper().replace("&", "")

        if not h_code or not a_code:
            continue

        h_id = f"ncaa_{h_code}"
        a_id = f"ncaa_{a_code}"

        h_score = int(home_comp.get("score", 0)) if str(home_comp.get("score", "")).isdigit() else 0
        a_score = int(away_comp.get("score", 0)) if str(away_comp.get("score", "")).isdigit() else 0

        status_type = comp.get("status", {}).get("type", {})
        is_completed = status_type.get("completed", False) or status_type.get("name") == "STATUS_FINAL"
        is_live = status_type.get("state") == "in" or status_type.get("name") == "STATUS_IN_PROGRESS"
        status_norm = "final" if is_completed else ("in_progress" if is_live else "scheduled")

        venue_info = comp.get("venue", {})
        venue_name = venue_info.get("fullName", "")

        game_id = f"ncaa_{season}_{week:02d}_{a_code.lower()}_{h_code.lower()}"
        game_date = event.get("date", f"{season}-08-29T17:00:00Z")

        games_to_save.append({
            "id": game_id,
            "league": "ncaa",
            "season": season,
            "season_type": "regular",
            "week": week,
            "game_date": game_date,
            "home_team_id": h_id,
            "away_team_id": a_id,
            "home_score": h_score,
            "away_score": a_score,
            "status": status_norm,
            "venue": venue_name,
            "weather_temp": None,
            "weather_desc": "",
            "highlight_url": f"https://www.youtube.com/results?search_query={a_code}+vs+{h_code}+College+Football+highlights",
            "event_id": eid,
        })

    if games_to_save:
        db.save_games(games_to_save, custom_path=custom_db_path)
        logger.info(f"Guardados {len(games_to_save)} partidos de NCAA.")

    return {"games_count": len(games_to_save), "status": "success"}
