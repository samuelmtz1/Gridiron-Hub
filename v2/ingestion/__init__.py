"""Ingestion Module for Gridiron Hub 2.0.

Provides assets management, ESPN client with strict event_id mapping,
and multi-division NFL/NCAA pipelines.
"""

from .assets_engine import (
    NFL_TEAMS,
    NCAA_CONFERENCES,
    load_all_teams,
    get_team_by_code,
)
from .espn_client import (
    fetch_espn_scoreboard,
    fetch_espn_game_summary,
    extract_teams_from_scoreboard,
)

__all__ = [
    "NFL_TEAMS",
    "NCAA_CONFERENCES",
    "load_all_teams",
    "get_team_by_code",
    "fetch_espn_scoreboard",
    "fetch_espn_game_summary",
    "extract_teams_from_scoreboard",
]

