"""Unit and integration tests for multi-week NFL/NCAA schedules and Super Bowl LX."""

import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from api.main import app
from storage import db
from mock import dataset


@pytest.fixture
def client_multiweek(tmp_path: Path, monkeypatch):
    """Sets up an isolated test database with full multiweek dataset."""
    test_db = tmp_path / "test_multiweek.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{test_db}")
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    dataset.seed_mock_environment(custom_db_path=test_db)

    with TestClient(app) as client:
        yield client


def test_public_read_ncaa_week_11(client_multiweek):
    """Verifies that unauthenticated visitors can fetch NCAA Week 11 games."""
    resp = client_multiweek.get("/api/games?league=ncaa&season=2024&week=11")
    assert resp.status_code == 200
    games = resp.json()
    assert len(games) >= 3
    teams = {g["home_code"] for g in games} | {g["away_code"] for g in games}
    assert "ALA" in teams
    assert "UGA" in teams
    assert "OSU" in teams
    assert "TEX" in teams


def test_nfl_week_10_games(client_multiweek):
    """Verifies that Week 10 NFL games are loaded correctly."""
    resp = client_multiweek.get("/api/games?league=nfl&season=2024&week=10")
    assert resp.status_code == 200
    games = resp.json()
    assert len(games) >= 2
    game_ids = [g["id"] for g in games]
    assert "nfl_2024_w10_det_hou" in game_ids
    assert "nfl_2024_w10_pit_was" in game_ids


def test_super_bowl_lx_game_and_tactical_analysis(client_multiweek):
    """Verifies Super Bowl LX 2026 data and deep tactical research."""
    resp = client_multiweek.get("/api/games?league=nfl&season=2026&week=22")
    assert resp.status_code == 200
    games = resp.json()
    assert len(games) == 1
    assert games[0]["id"] == "nfl_2026_sb_sea_ne"
    assert games[0]["home_score"] == 29
    assert games[0]["away_score"] == 13

    # Fetch detail
    detail_resp = client_multiweek.get("/api/games/nfl_2026_sb_sea_ne")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert "tactical_analysis" in detail
    tactical = detail["tactical_analysis"]
    assert "Dark Side" in tactical["narrative_summary"]
    assert len(tactical["historic_facts"]) >= 3
    assert len(tactical["award_deep_dives"]) >= 3
    assert len(tactical["tactical_dos_donts"]) >= 2
