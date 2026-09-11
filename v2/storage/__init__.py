"""Storage and Database Module for Gridiron Hub 2.0."""

from .db import (
    get_connection,
    init_db,
    save_games,
    save_teams,
    get_games,
    get_game_by_id,
    get_team_by_id,
    get_teams,
    save_game_team_stats,
    save_key_plays,
    save_game_trivia,
    save_awards_candidates,
    get_awards,
)

__all__ = [
    "get_connection",
    "init_db",
    "save_games",
    "save_teams",
    "get_games",
    "get_game_by_id",
    "get_team_by_id",
    "get_teams",
    "save_game_team_stats",
    "save_key_plays",
    "save_game_trivia",
    "save_awards_candidates",
    "get_awards",
]

