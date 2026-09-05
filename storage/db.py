"""Database module for Gridiron Hub.

Provides SQLite connection management, schema initialization, and
optimized query/persistence helpers for games, EPA/WP metrics, and awards.
Cost: $0 perpetual.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "gridiron.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_db_path(custom_path: Optional[str | Path] = None) -> Path | str:
    """Returns the database path, allowing env var or custom overrides."""
    if custom_path:
        return custom_path
    env_path = os.getenv("DATABASE_URL")
    if env_path and env_path.startswith("sqlite:///"):
        clean_path = env_path.replace("sqlite:///", "")
        return Path(clean_path).resolve()
    return DEFAULT_DB_PATH


def get_connection(custom_path: Optional[str | Path] = None) -> sqlite3.Connection:
    """Creates a sqlite3 connection with Row factory and foreign keys enabled."""
    target_path = get_db_path(custom_path)
    if isinstance(target_path, Path):
        target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(custom_path: Optional[str | Path] = None, schema_file: Optional[Path] = None) -> None:
    """Executes the DDL schema to set up tables and indices."""
    schema_file = schema_file or SCHEMA_PATH
    with open(schema_file, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with get_connection(custom_path) as conn:
        conn.executescript(schema_sql)
        conn.commit()


# ==============================================================================
# Ingestion / Persistence Helpers
# ==============================================================================


def save_teams(teams: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts or updates team records."""
    query = """
    INSERT INTO teams (
        id, league, code, name, short_name, city, conference, division,
        primary_color, secondary_color, logo_url
    ) VALUES (
        :id, :league, :code, :name, :short_name, :city, :conference, :division,
        :primary_color, :secondary_color, :logo_url
    ) ON CONFLICT(id) DO UPDATE SET
        conference = excluded.conference,
        division = excluded.division,
        primary_color = excluded.primary_color,
        secondary_color = excluded.secondary_color,
        logo_url = excluded.logo_url;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, teams)
        conn.commit()


def save_games(games: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts or updates game records."""
    query = """
    INSERT INTO games (
        id, league, season, season_type, week, game_date,
        home_team_id, away_team_id, home_score, away_score, status,
        venue, weather_temp, weather_desc, highlight_url
    ) VALUES (
        :id, :league, :season, :season_type, :week, :game_date,
        :home_team_id, :away_team_id, :home_score, :away_score, :status,
        :venue, :weather_temp, :weather_desc, :highlight_url
    ) ON CONFLICT(id) DO UPDATE SET
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        status = excluded.status,
        venue = excluded.venue,
        weather_temp = excluded.weather_temp,
        weather_desc = excluded.weather_desc,
        highlight_url = excluded.highlight_url;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, games)
        conn.commit()


def save_game_team_stats(stats: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts advanced team stats per game (EPA, efficiency)."""
    query = """
    INSERT INTO game_team_stats (
        id, game_id, team_id, is_home, total_yards, passing_yards, rushing_yards,
        turnovers, epa_total, epa_pass, epa_rush,
        third_down_comp, third_down_att, red_zone_comp, red_zone_att, time_of_possession
    ) VALUES (
        :id, :game_id, :team_id, :is_home, :total_yards, :passing_yards, :rushing_yards,
        :turnovers, :epa_total, :epa_pass, :epa_rush,
        :third_down_comp, :third_down_att, :red_zone_comp, :red_zone_att, :time_of_possession
    ) ON CONFLICT(id) DO UPDATE SET
        total_yards = excluded.total_yards,
        passing_yards = excluded.passing_yards,
        rushing_yards = excluded.rushing_yards,
        turnovers = excluded.turnovers,
        epa_total = excluded.epa_total,
        epa_pass = excluded.epa_pass,
        epa_rush = excluded.epa_rush,
        third_down_comp = excluded.third_down_comp,
        third_down_att = excluded.third_down_att,
        red_zone_comp = excluded.red_zone_comp,
        red_zone_att = excluded.red_zone_att,
        time_of_possession = excluded.time_of_possession;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, stats)
        conn.commit()


def save_key_plays(plays: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts key plays filtered by EPA and Win Probability swing."""
    query = """
    INSERT INTO key_plays (
        id, game_id, play_id, quarter, time_remaining, down, ydstogo, yardline,
        possession_team_id, play_type, description, epa, wp_before, wp_after,
        wp_swing, is_turnover, is_touchdown, highlight_timestamp
    ) VALUES (
        :id, :game_id, :play_id, :quarter, :time_remaining, :down, :ydstogo, :yardline,
        :possession_team_id, :play_type, :description, :epa, :wp_before, :wp_after,
        :wp_swing, :is_turnover, :is_touchdown, :highlight_timestamp
    ) ON CONFLICT(id) DO UPDATE SET
        description = excluded.description,
        epa = excluded.epa,
        wp_swing = excluded.wp_swing,
        highlight_timestamp = excluded.highlight_timestamp;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, plays)
        conn.commit()


def save_player_weekly_stats(stats: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts player weekly metrics for award calculations."""
    query = """
    INSERT INTO player_weekly_stats (
        id, player_name, team_id, league, season, week, position,
        epa_total, epa_pass, epa_rush, epa_defense,
        pass_yards, pass_td, pass_int, rush_yards, rush_td,
        rec_yards, rec_td, tackles, sacks, interceptions
    ) VALUES (
        :id, :player_name, :team_id, :league, :season, :week, :position,
        :epa_total, :epa_pass, :epa_rush, :epa_defense,
        :pass_yards, :pass_td, :pass_int, :rush_yards, :rush_td,
        :rec_yards, :rec_td, :tackles, :sacks, :interceptions
    ) ON CONFLICT(id) DO UPDATE SET
        epa_total = excluded.epa_total,
        epa_pass = excluded.epa_pass,
        epa_rush = excluded.epa_rush,
        epa_defense = excluded.epa_defense,
        pass_yards = excluded.pass_yards,
        pass_td = excluded.pass_td,
        rush_yards = excluded.rush_yards,
        rush_td = excluded.rush_td,
        rec_yards = excluded.rec_yards,
        rec_td = excluded.rec_td,
        tackles = excluded.tackles,
        sacks = excluded.sacks,
        interceptions = excluded.interceptions;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, stats)
        conn.commit()


def save_awards_candidates(awards: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts preselected award nominees."""
    query = """
    INSERT INTO awards_candidates (
        id, league, season, week, category, candidate_name, team_id,
        stat_summary, metric_value, clip_url, rank
    ) VALUES (
        :id, :league, :season, :week, :category, :candidate_name, :team_id,
        :stat_summary, :metric_value, :clip_url, :rank
    ) ON CONFLICT(id) DO UPDATE SET
        stat_summary = excluded.stat_summary,
        metric_value = excluded.metric_value,
        clip_url = excluded.clip_url,
        rank = excluded.rank;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, awards)
        conn.commit()


def save_game_trivia(trivia_items: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts narrative trivia and records."""
    query = """
    INSERT INTO game_trivia (id, game_id, category, fact_text)
    VALUES (:id, :game_id, :category, :fact_text)
    ON CONFLICT(id) DO UPDATE SET fact_text = excluded.fact_text;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, trivia_items)
        conn.commit()


# ==============================================================================
# Query Helpers
# ==============================================================================


def get_teams(league: Optional[str] = None, conference: Optional[str] = None, custom_path: Optional[str | Path] = None) -> List[Dict[str, Any]]:
    """Fetches teams, filtered by league or conference."""
    query = "SELECT * FROM teams WHERE 1=1"
    params: List[Any] = []
    if league:
        query += " AND league = ?"
        params.append(league)
    if conference:
        query += " AND conference = ?"
        params.append(conference)
    query += " ORDER BY conference, division, name ASC"

    with get_connection(custom_path) as conn:
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def get_games_by_week(league: str, season: int, week: int, custom_path: Optional[str | Path] = None) -> List[Dict[str, Any]]:
    """Retrieves all games for a specific week with home and away team details."""
    query = """
    SELECT 
        g.*,
        ht.code AS home_code, ht.name AS home_name, ht.short_name AS home_short,
        ht.primary_color AS home_primary, ht.secondary_color AS home_secondary, ht.logo_url AS home_logo,
        ht.conference AS home_conference, ht.division AS home_division,
        at.code AS away_code, at.name AS away_name, at.short_name AS away_short,
        at.primary_color AS away_primary, at.secondary_color AS away_secondary, at.logo_url AS away_logo,
        at.conference AS away_conference, at.division AS away_division
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.league = ? AND g.season = ? AND g.week = ?
    ORDER BY g.game_date ASC;
    """
    with get_connection(custom_path) as conn:
        cursor = conn.execute(query, (league, season, week))
        return [dict(row) for row in cursor.fetchall()]


def get_game_details(game_id: str, custom_path: Optional[str | Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieves complete details of a game, including stats, top plays, and trivia."""
    game_query = """
    SELECT 
        g.*,
        ht.code AS home_code, ht.name AS home_name, ht.short_name AS home_short,
        ht.primary_color AS home_primary, ht.secondary_color AS home_secondary, ht.logo_url AS home_logo,
        at.code AS away_code, at.name AS away_name, at.short_name AS away_short,
        at.primary_color AS away_primary, at.secondary_color AS away_secondary, at.logo_url AS away_logo
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.id = ?;
    """
    stats_query = "SELECT * FROM game_team_stats WHERE game_id = ?;"
    plays_query = "SELECT * FROM key_plays WHERE game_id = ? ORDER BY wp_swing DESC LIMIT 5;"
    trivia_query = "SELECT * FROM game_trivia WHERE game_id = ?;"

    with get_connection(custom_path) as conn:
        game_cur = conn.execute(game_query, (game_id,))
        game_row = game_cur.fetchone()
        if not game_row:
            return None

        game_data = dict(game_row)
        game_data["team_stats"] = [dict(r) for r in conn.execute(stats_query, (game_id,)).fetchall()]
        game_data["key_plays"] = [dict(r) for r in conn.execute(plays_query, (game_id,)).fetchall()]
        game_data["trivia"] = [dict(r) for r in conn.execute(trivia_query, (game_id,)).fetchall()]
        game_data["tactical_analysis"] = get_game_tactical_analysis(game_id, custom_path=custom_path)
        return game_data


def save_game_tactical_analysis(analyses: List[Dict[str, Any]], custom_path: Optional[str | Path] = None) -> None:
    """Inserts or updates structured tactical research analysis for games."""
    query = """
    INSERT INTO game_tactical_analysis (
        id, game_id, headline, narrative_summary,
        historic_facts, award_deep_dives, tactical_dos_donts
    ) VALUES (
        :id, :game_id, :headline, :narrative_summary,
        :historic_facts, :award_deep_dives, :tactical_dos_donts
    ) ON CONFLICT(game_id) DO UPDATE SET
        headline = excluded.headline,
        narrative_summary = excluded.narrative_summary,
        historic_facts = excluded.historic_facts,
        award_deep_dives = excluded.award_deep_dives,
        tactical_dos_donts = excluded.tactical_dos_donts;
    """
    formatted = []
    for a in analyses:
        item = dict(a)
        if isinstance(item.get("historic_facts"), (list, dict)):
            item["historic_facts"] = json.dumps(item["historic_facts"], ensure_ascii=False)
        if isinstance(item.get("award_deep_dives"), (list, dict)):
            item["award_deep_dives"] = json.dumps(item["award_deep_dives"], ensure_ascii=False)
        if isinstance(item.get("tactical_dos_donts"), (list, dict)):
            item["tactical_dos_donts"] = json.dumps(item["tactical_dos_donts"], ensure_ascii=False)
        formatted.append(item)

    with get_connection(custom_path) as conn:
        conn.executemany(query, formatted)
        conn.commit()


def get_game_tactical_analysis(game_id: str, custom_path: Optional[str | Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieves structured tactical research analysis for a specific game."""
    query = "SELECT * FROM game_tactical_analysis WHERE game_id = ?;"
    with get_connection(custom_path) as conn:
        row = conn.execute(query, (game_id,)).fetchone()
        if not row:
            return None
        res = dict(row)
        for key in ("historic_facts", "award_deep_dives", "tactical_dos_donts"):
            val = res.get(key)
            if isinstance(val, str):
                try:
                    res[key] = json.loads(val)
                except Exception:
                    res[key] = []
        return res


def get_awards(league: str, season: int, week: int, category: Optional[str] = None, custom_path: Optional[str | Path] = None) -> List[Dict[str, Any]]:
    """Fetches award nominees for the week with team details."""
    query = """
    SELECT a.*, t.name AS team_name, t.short_name AS team_short, t.logo_url AS team_logo,
           t.primary_color AS team_primary
    FROM awards_candidates a
    JOIN teams t ON a.team_id = t.id
    WHERE a.league = ? AND a.season = ? AND a.week = ?
    """
    params: List[Any] = [league, season, week]
    if category:
        query += " AND a.category = ?"
        params.append(category)
    query += " ORDER BY a.category ASC, a.rank ASC;"

    with get_connection(custom_path) as conn:
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

