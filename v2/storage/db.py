"""Database Access Layer for Gridiron Hub 2.0.

Provides high-performance SQLite operations with WAL mode, foreign keys,
upsert transactions, and enriched queries for frontend and API consumers.
Cost: $0 perpetual.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "gridiron_v2.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_connection(custom_path: Optional[Union[str, Path]] = None) -> sqlite3.Connection:
    """Creates a configured SQLite connection with foreign keys and WAL journal mode."""
    db_path = Path(custom_path) if custom_path else Path(os.getenv("DATABASE_PATH", DEFAULT_DB_PATH))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(custom_path: Optional[Union[str, Path]] = None) -> None:
    """Executes the DDL schema to ensure all v2 tables and indexes exist."""
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with get_connection(custom_path) as conn:
        conn.executescript(schema_sql)
        conn.commit()


# --- TEAMS ---

def save_teams(teams: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not teams:
        return
    query = """
    INSERT INTO teams (
        id, league, code, name, short_name, city, conference, division,
        primary_color, secondary_color, logo_url
    ) VALUES (
        :id, :league, :code, :name, :short_name, :city, :conference, :division,
        :primary_color, :secondary_color, :logo_url
    ) ON CONFLICT(id) DO UPDATE SET
        league = excluded.league,
        code = excluded.code,
        name = excluded.name,
        short_name = excluded.short_name,
        city = excluded.city,
        conference = excluded.conference,
        division = excluded.division,
        primary_color = excluded.primary_color,
        secondary_color = excluded.secondary_color,
        logo_url = excluded.logo_url;
    """
    clean_teams = []
    for t in teams:
        clean_teams.append({
            "id": t["id"],
            "league": t.get("league", "nfl"),
            "code": t["code"],
            "name": t.get("name", t["code"]),
            "short_name": t.get("short_name", t["code"]),
            "city": t.get("city", ""),
            "conference": t.get("conference", "AFC"),
            "division": t.get("division"),
            "primary_color": t.get("primary_color", "#002244"),
            "secondary_color": t.get("secondary_color", "#FFFFFF"),
            "logo_url": t.get("logo_url", ""),
        })

    with get_connection(custom_path) as conn:
        conn.executemany(query, clean_teams)
        conn.commit()


def get_teams(league: Optional[str] = None, custom_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM teams"
    params = []
    if league:
        query += " WHERE league = ?"
        params.append(league.lower())
    query += " ORDER BY conference, division, name ASC"

    with get_connection(custom_path) as conn:
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def get_team_by_id(team_id: str, custom_path: Optional[Union[str, Path]] = None) -> Optional[Dict[str, Any]]:
    with get_connection(custom_path) as conn:
        cursor = conn.execute("SELECT * FROM teams WHERE id = ? OR code = ?", (team_id, team_id.upper()))
        row = cursor.fetchone()
        return dict(row) if row else None


# --- GAMES ---

def save_games(games: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not games:
        return
    query = """
    INSERT INTO games (
        id, league, season, season_type, week, game_date,
        home_team_id, away_team_id, home_score, away_score, status,
        venue, weather_temp, weather_desc, highlight_url, event_id
    ) VALUES (
        :id, :league, :season, :season_type, :week, :game_date,
        :home_team_id, :away_team_id, :home_score, :away_score, :status,
        :venue, :weather_temp, :weather_desc, :highlight_url, :event_id
    ) ON CONFLICT(id) DO UPDATE SET
        season = excluded.season,
        season_type = excluded.season_type,
        week = excluded.week,
        game_date = excluded.game_date,
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        status = excluded.status,
        venue = excluded.venue,
        weather_temp = excluded.weather_temp,
        weather_desc = excluded.weather_desc,
        highlight_url = excluded.highlight_url,
        event_id = COALESCE(excluded.event_id, games.event_id);
    """
    clean_games = []
    for g in games:
        clean_games.append({
            "id": g["id"],
            "league": g.get("league", "nfl"),
            "season": int(g.get("season", 2026)),
            "season_type": g.get("season_type", "regular"),
            "week": int(g.get("week", 1)),
            "game_date": g.get("game_date", ""),
            "home_team_id": g["home_team_id"],
            "away_team_id": g["away_team_id"],
            "home_score": int(g.get("home_score", 0)),
            "away_score": int(g.get("away_score", 0)),
            "status": g.get("status", "scheduled"),
            "venue": g.get("venue", ""),
            "weather_temp": g.get("weather_temp"),
            "weather_desc": g.get("weather_desc", ""),
            "highlight_url": g.get("highlight_url"),
            "event_id": g.get("event_id"),
        })

    with get_connection(custom_path) as conn:
        conn.executemany(query, clean_games)
        conn.commit()


def get_games(
    league: Optional[str] = None,
    season: Optional[int] = None,
    week: Optional[int] = None,
    custom_path: Optional[Union[str, Path]] = None,
) -> List[Dict[str, Any]]:
    query = """
    SELECT
        g.*,
        ht.code as home_code, ht.name as home_name, ht.short_name as home_short,
        ht.primary_color as home_primary, ht.secondary_color as home_secondary,
        ht.logo_url as home_logo, ht.conference as home_conference, ht.division as home_division,
        at.code as away_code, at.name as away_name, at.short_name as away_short,
        at.primary_color as away_primary, at.secondary_color as away_secondary,
        at.logo_url as away_logo, at.conference as away_conference, at.division as away_division
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE 1=1
    """
    params: List[Any] = []
    if league:
        query += " AND g.league = ?"
        params.append(league.lower())
    if season:
        query += " AND g.season = ?"
        params.append(season)
    if week:
        query += " AND g.week = ?"
        params.append(week)

    query += " ORDER BY g.game_date ASC"

    with get_connection(custom_path) as conn:
        cursor = conn.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]

    # Hydrate team_stats, key_plays, trivia for each game
    for row in rows:
        gid = row["id"]
        row["team_stats"] = get_game_team_stats(gid, custom_path=custom_path)
        row["key_plays"] = get_key_plays(gid, custom_path=custom_path)
        row["trivia"] = get_game_trivia(gid, custom_path=custom_path)
        row["tactical_analysis"] = get_tactical_analysis(gid, custom_path=custom_path)

    return rows


def get_game_by_id(game_id: str, custom_path: Optional[Union[str, Path]] = None) -> Optional[Dict[str, Any]]:
    query = """
    SELECT
        g.*,
        ht.code as home_code, ht.name as home_name, ht.short_name as home_short,
        ht.primary_color as home_primary, ht.secondary_color as home_secondary,
        ht.logo_url as home_logo, ht.conference as home_conference, ht.division as home_division,
        at.code as away_code, at.name as away_name, at.short_name as away_short,
        at.primary_color as away_primary, at.secondary_color as away_secondary,
        at.logo_url as away_logo, at.conference as away_conference, at.division as away_division
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.id = ? OR g.event_id = ?
    """
    with get_connection(custom_path) as conn:
        row = conn.execute(query, (game_id, game_id)).fetchone()
        if not row:
            return None
        res = dict(row)
        gid = res["id"]
        res["team_stats"] = get_game_team_stats(gid, custom_path=custom_path)
        res["key_plays"] = get_key_plays(gid, custom_path=custom_path)
        res["trivia"] = get_game_trivia(gid, custom_path=custom_path)
        res["tactical_analysis"] = get_tactical_analysis(gid, custom_path=custom_path)
        return res


# --- STATS, PLAYS, TRIVIA & AWARDS ---

def save_game_team_stats(stats: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not stats:
        return
    query = """
    INSERT INTO game_team_stats (
        id, game_id, team_id, is_home, total_yards, passing_yards, rushing_yards,
        turnovers, epa_total, epa_pass, epa_rush, third_down_comp, third_down_att,
        red_zone_comp, red_zone_att, time_of_possession
    ) VALUES (
        :id, :game_id, :team_id, :is_home, :total_yards, :passing_yards, :rushing_yards,
        :turnovers, :epa_total, :epa_pass, :epa_rush, :third_down_comp, :third_down_att,
        :red_zone_comp, :red_zone_att, :time_of_possession
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


def get_game_team_stats(game_id: str, custom_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with get_connection(custom_path) as conn:
        cursor = conn.execute("SELECT * FROM game_team_stats WHERE game_id = ? ORDER BY is_home ASC", (game_id,))
        return [dict(r) for r in cursor.fetchall()]


def save_key_plays(plays: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not plays:
        return
    query = """
    INSERT INTO key_plays (
        id, game_id, play_id, quarter, time_remaining, down, ydstogo, yardline,
        possession_team_id, play_type, description, epa, wp_before, wp_after, wp_swing,
        is_turnover, is_touchdown, highlight_timestamp
    ) VALUES (
        :id, :game_id, :play_id, :quarter, :time_remaining, :down, :ydstogo, :yardline,
        :possession_team_id, :play_type, :description, :epa, :wp_before, :wp_after, :wp_swing,
        :is_turnover, :is_touchdown, :highlight_timestamp
    ) ON CONFLICT(id) DO UPDATE SET
        epa = excluded.epa,
        wp_swing = excluded.wp_swing,
        description = excluded.description;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, plays)
        conn.commit()


def get_key_plays(game_id: str, custom_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with get_connection(custom_path) as conn:
        cursor = conn.execute("SELECT * FROM key_plays WHERE game_id = ? ORDER BY wp_swing DESC, quarter DESC LIMIT 8", (game_id,))
        return [dict(r) for r in cursor.fetchall()]


def save_game_trivia(trivia: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not trivia:
        return
    query = """
    INSERT INTO game_trivia (id, game_id, category, fact_text)
    VALUES (:id, :game_id, :category, :fact_text)
    ON CONFLICT(id) DO UPDATE SET fact_text = excluded.fact_text;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, trivia)
        conn.commit()


def get_game_trivia(game_id: str, custom_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with get_connection(custom_path) as conn:
        cursor = conn.execute("SELECT * FROM game_trivia WHERE game_id = ? ORDER BY id ASC", (game_id,))
        return [dict(r) for r in cursor.fetchall()]


def save_awards_candidates(awards: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not awards:
        return
    query = """
    INSERT INTO awards_candidates (
        id, season, week, league, category, rank, candidate_name, candidate_type,
        team_id, stat_summary, highlight_url
    ) VALUES (
        :id, :season, :week, :league, :category, :rank, :candidate_name, :candidate_type,
        :team_id, :stat_summary, :highlight_url
    ) ON CONFLICT(id) DO UPDATE SET
        stat_summary = excluded.stat_summary,
        rank = excluded.rank,
        highlight_url = excluded.highlight_url;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, awards)
        conn.commit()


def get_awards(
    league: Optional[str] = None,
    season: Optional[int] = None,
    week: Optional[int] = None,
    custom_path: Optional[Union[str, Path]] = None,
) -> List[Dict[str, Any]]:
    query = """
    SELECT
        a.*,
        t.code as team_code, t.name as team_name, t.short_name as team_short,
        t.logo_url as team_logo, t.primary_color as team_primary, t.secondary_color as team_secondary
    FROM awards_candidates a
    LEFT JOIN teams t ON a.team_id = t.id
    WHERE 1=1
    """
    params: List[Any] = []
    if league:
        query += " AND a.league = ?"
        params.append(league.lower())
    if season:
        query += " AND a.season = ?"
        params.append(season)
    if week:
        query += " AND a.week = ?"
        params.append(week)

    query += " ORDER BY a.category ASC, a.rank ASC"

    with get_connection(custom_path) as conn:
        cursor = conn.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]


def save_tactical_analysis(analyses: List[Dict[str, Any]], custom_path: Optional[Union[str, Path]] = None) -> None:
    if not analyses:
        return
    query = """
    INSERT INTO tactical_analysis (id, game_id, offensive_scheme, defensive_scheme, key_matchup, coach_tendency)
    VALUES (:id, :game_id, :offensive_scheme, :defensive_scheme, :key_matchup, :coach_tendency)
    ON CONFLICT(id) DO UPDATE SET
        offensive_scheme = excluded.offensive_scheme,
        defensive_scheme = excluded.defensive_scheme,
        key_matchup = excluded.key_matchup,
        coach_tendency = excluded.coach_tendency;
    """
    with get_connection(custom_path) as conn:
        conn.executemany(query, analyses)
        conn.commit()


def get_tactical_analysis(game_id: str, custom_path: Optional[Union[str, Path]] = None) -> Optional[Dict[str, Any]]:
    with get_connection(custom_path) as conn:
        cursor = conn.execute("SELECT * FROM tactical_analysis WHERE game_id = ?", (game_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

