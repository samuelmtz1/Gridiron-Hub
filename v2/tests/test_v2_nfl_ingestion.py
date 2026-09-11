"""Tests for NFL Ingestion, Event ID Binding, and EPA Calculation (Gridiron Hub 2.0)."""

from pathlib import Path
import pytest

from v2.ingestion.assets_engine import NFL_TEAMS, get_team_by_code
from v2.ingestion.espn_client import (
    extract_teams_from_scoreboard,
    fetch_espn_game_summary,
)
from v2.processing.epa_calculator import calculate_team_epa, calculate_play_epa
from v2.processing.wp_calculator import calculate_wp_swing, rank_top_plays
from v2.storage import db


@pytest.fixture
def test_db(tmp_path):
    p = tmp_path / "test_nfl.db"
    db.init_db(custom_path=p)
    db.save_teams(NFL_TEAMS, custom_path=p)
    return p


def test_nfl_teams_completeness_and_divisions():
    assert len(NFL_TEAMS) == 32

    conferences = {t["conference"] for t in NFL_TEAMS}
    assert conferences == {"AFC", "NFC"}

    divisions = {t["division"] for t in NFL_TEAMS}
    assert divisions == {"East", "North", "South", "West"}

    # Every division must have exactly 4 teams
    for conf in ["AFC", "NFC"]:
        for div in ["East", "North", "South", "West"]:
            div_teams = [t for t in NFL_TEAMS if t["conference"] == conf and t["division"] == div]
            assert len(div_teams) == 4, f"Division {conf} {div} should have 4 teams"


def test_scoreboard_extract_teams_preserves_nfl_divisions():
    mock_scoreboard = {
        "events": [
            {
                "competitions": [
                    {
                        "competitors": [
                            {"homeAway": "home", "team": {"abbreviation": "KC", "displayName": "Chiefs", "color": "E31837"}},
                            {"homeAway": "away", "team": {"abbreviation": "BUF", "displayName": "Bills", "color": "00338D"}}
                        ]
                    }
                ]
            }
        ]
    }

    teams = extract_teams_from_scoreboard(mock_scoreboard, league="nfl")
    assert len(teams) == 2

    kc = next(t for t in teams if t["code"] == "KC")
    buf = next(t for t in teams if t["code"] == "BUF")

    assert kc["conference"] == "AFC"
    assert kc["division"] == "West"
    assert buf["conference"] == "AFC"
    assert buf["division"] == "East"


def test_epa_calculation():
    epa = calculate_team_epa(
        pass_yards=280,
        rush_yards=120,
        pass_attempts=32,
        rush_attempts=25,
        pass_tds=2,
        rush_tds=1,
        interceptions=1,
        fumbles_lost=0,
        third_down_comp=7,
        turnovers=1
    )

    assert "epa_total" in epa
    assert "epa_pass" in epa
    assert "epa_rush" in epa
    assert isinstance(epa["epa_total"], float)
    assert epa["epa_total"] > 0


def test_event_id_retention_in_db(test_db):
    game = {
        "id": "nfl_2026_01_buf_kc",
        "league": "nfl",
        "season": 2026,
        "season_type": "regular",
        "week": 1,
        "game_date": "2026-09-10T20:20:00Z",
        "home_team_id": "nfl_KC",
        "away_team_id": "nfl_BUF",
        "home_score": 27,
        "away_score": 24,
        "status": "final",
        "venue": "GEHA Field at Arrowhead Stadium",
        "event_id": "401671780",
    }

    db.save_games([game], custom_path=test_db)
    retrieved = db.get_game_by_id("nfl_2026_01_buf_kc", custom_path=test_db)

    assert retrieved is not None
    assert retrieved["event_id"] == "401671780"
    assert retrieved["home_conference"] == "AFC"
    assert retrieved["home_division"] == "West"
    assert retrieved["away_conference"] == "AFC"
    assert retrieved["away_division"] == "East"
