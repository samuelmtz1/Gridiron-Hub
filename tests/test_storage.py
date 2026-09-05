"""Unit tests for Gridiron Hub Storage Layer (schema & db.py)."""

import pytest
import sqlite3
from pathlib import Path
from storage import db


@pytest.fixture
def temp_db(tmp_path: Path):
    """Provides a fresh, temporary SQLite database for each test."""
    db_file = tmp_path / "test_gridiron.db"
    db.init_db(custom_path=db_file)
    return db_file


def test_schema_tables_created(temp_db):
    """Verifies that all required tables and indexes exist in the initialized database."""
    with db.get_connection(temp_db) as conn:
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {row["name"] for row in cursor.fetchall()}

    expected = {
        "teams",
        "games",
        "game_team_stats",
        "key_plays",
        "player_weekly_stats",
        "awards_candidates",
        "game_trivia",
    }
    assert expected.issubset(tables)


def test_save_and_get_teams(temp_db):
    """Verifies storing and retrieving team metadata with official hex colors and logos."""
    teams_data = [
        {
            "id": "nfl_KC",
            "league": "nfl",
            "code": "KC",
            "name": "Kansas City Chiefs",
            "short_name": "Chiefs",
            "city": "Kansas City",
            "conference": "AFC",
            "division": "West",
            "primary_color": "#E31837",
            "secondary_color": "#FFB81C",
            "logo_url": "https://raw.githubusercontent.com/nflverse/nflplotR/main/data-raw/logos/kc.svg",
        },
        {
            "id": "nfl_BUF",
            "league": "nfl",
            "code": "BUF",
            "name": "Buffalo Bills",
            "short_name": "Bills",
            "city": "Buffalo",
            "conference": "AFC",
            "division": "East",
            "primary_color": "#00338D",
            "secondary_color": "#C60C30",
            "logo_url": "https://raw.githubusercontent.com/nflverse/nflplotR/main/data-raw/logos/buf.svg",
        },
    ]

    db.save_teams(teams_data, custom_path=temp_db)

    # Query all
    all_teams = db.get_teams(league="nfl", custom_path=temp_db)
    assert len(all_teams) == 2

    # Query conference filter
    afc_teams = db.get_teams(league="nfl", conference="AFC", custom_path=temp_db)
    assert len(afc_teams) == 2
    assert afc_teams[0]["code"] in ["KC", "BUF"]


def test_save_and_get_game_with_details(temp_db):
    """Verifies saving game scores, key plays, and retrieval of full game context."""
    # 1. Insert teams
    db.save_teams(
        [
            {
                "id": "nfl_KC",
                "league": "nfl",
                "code": "KC",
                "name": "Kansas City Chiefs",
                "short_name": "Chiefs",
                "city": "Kansas City",
                "conference": "AFC",
                "division": "West",
                "primary_color": "#E31837",
                "secondary_color": "#FFB81C",
                "logo_url": "kc.svg",
            },
            {
                "id": "nfl_BUF",
                "league": "nfl",
                "code": "BUF",
                "name": "Buffalo Bills",
                "short_name": "Bills",
                "city": "Buffalo",
                "conference": "AFC",
                "division": "East",
                "primary_color": "#00338D",
                "secondary_color": "#C60C30",
                "logo_url": "buf.svg",
            },
        ],
        custom_path=temp_db,
    )

    # 2. Insert game
    game_id = "nfl_2024_w11_buf_kc"
    db.save_games(
        [
            {
                "id": game_id,
                "league": "nfl",
                "season": 2024,
                "season_type": "regular",
                "week": 11,
                "game_date": "2024-11-17",
                "home_team_id": "nfl_BUF",
                "away_team_id": "nfl_KC",
                "home_score": 30,
                "away_score": 21,
                "status": "final",
                "venue": "Highmark Stadium",
                "weather_temp": 45,
                "weather_desc": "Nublado",
                "highlight_url": "https://youtube.com/watch?v=mock123",
            }
        ],
        custom_path=temp_db,
    )

    # 3. Insert key play with WP swing
    db.save_key_plays(
        [
            {
                "id": "play_buf_td_01",
                "game_id": game_id,
                "play_id": "3200",
                "quarter": 4,
                "time_remaining": "02:27",
                "down": 4,
                "ydstogo": 2,
                "yardline": "KC 26",
                "possession_team_id": "nfl_BUF",
                "play_type": "run",
                "description": "J.Allen corre por el centro 26 yardas para TOUCHDOWN.",
                "epa": 4.12,
                "wp_before": 0.82,
                "wp_after": 0.99,
                "wp_swing": 0.17,
                "is_turnover": 0,
                "is_touchdown": 1,
                "highlight_timestamp": 540,
            }
        ],
        custom_path=temp_db,
    )

    # 4. Insert trivia
    db.save_game_trivia(
        [
            {
                "id": "trivia_buf_01",
                "game_id": game_id,
                "category": "streak",
                "fact_text": "Bills cortan la racha invicta de 9 victorias de los Chiefs.",
            }
        ],
        custom_path=temp_db,
    )

    # Query week
    week_games = db.get_games_by_week(league="nfl", season=2024, week=11, custom_path=temp_db)
    assert len(week_games) == 1
    assert week_games[0]["home_code"] == "BUF"
    assert week_games[0]["away_code"] == "KC"
    assert week_games[0]["home_score"] == 30

    # Query game details
    details = db.get_game_details(game_id, custom_path=temp_db)
    assert details is not None
    assert len(details["key_plays"]) == 1
    assert details["key_plays"][0]["wp_swing"] == 0.17
    assert len(details["trivia"]) == 1


def test_save_and_get_awards(temp_db):
    """Verifies saving preselected awards (OPOW, DPOW, MVP) and ranking."""
    db.save_teams(
        [
            {
                "id": "nfl_BAL",
                "league": "nfl",
                "code": "BAL",
                "name": "Baltimore Ravens",
                "short_name": "Ravens",
                "city": "Baltimore",
                "conference": "AFC",
                "division": "North",
                "primary_color": "#241773",
                "secondary_color": "#000000",
                "logo_url": "bal.svg",
            }
        ],
        custom_path=temp_db,
    )

    awards = [
        {
            "id": "award_2024_w11_opow_1",
            "league": "nfl",
            "season": 2024,
            "week": 11,
            "category": "OPOW",
            "candidate_name": "Lamar Jackson",
            "team_id": "nfl_BAL",
            "stat_summary": "4 TD pase, 1 TD carrera, +21.4 EPA",
            "metric_value": 21.4,
            "clip_url": "https://youtube.com/watch?v=lamar_w11",
            "rank": 1,
        },
        {
            "id": "award_2024_w11_opow_2",
            "league": "nfl",
            "season": 2024,
            "week": 11,
            "category": "OPOW",
            "candidate_name": "Derrick Henry",
            "team_id": "nfl_BAL",
            "stat_summary": "165 yardas, 2 TD, +14.2 EPA",
            "metric_value": 14.2,
            "clip_url": "https://youtube.com/watch?v=henry_w11",
            "rank": 2,
        },
    ]

    db.save_awards_candidates(awards, custom_path=temp_db)

    fetched = db.get_awards(league="nfl", season=2024, week=11, category="OPOW", custom_path=temp_db)
    assert len(fetched) == 2
    assert fetched[0]["candidate_name"] == "Lamar Jackson"
    assert fetched[0]["rank"] == 1
    assert fetched[0]["team_name"] == "Baltimore Ravens"

