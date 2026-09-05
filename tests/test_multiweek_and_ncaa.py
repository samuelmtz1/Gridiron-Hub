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
    """Verifies Super Bowl LX 2026 data and deep tactical research under Season 2025."""
    resp = client_multiweek.get("/api/games?league=nfl&season=2025&week=22")
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


def test_nfl_season_2026_week_1_kickoff(client_multiweek):
    """Verifies Season 2026-2027 NFL Kickoff Week 1 games, boxscores, and tactical analyses."""
    resp = client_multiweek.get("/api/games?league=nfl&season=2026&week=1")
    assert resp.status_code == 200
    games = resp.json()
    assert len(games) == 3

    game_ids = [g["id"] for g in games]
    assert "nfl_2026_w1_bal_kc" in game_ids
    assert "nfl_2026_w1_gb_phi" in game_ids
    assert "nfl_2026_w1_lar_det" in game_ids

    # Check Chiefs vs Ravens game detail
    kc_resp = client_multiweek.get("/api/games/nfl_2026_w1_bal_kc")
    assert kc_resp.status_code == 200
    kc_detail = kc_resp.json()
    assert kc_detail["home_score"] == 27
    assert kc_detail["away_score"] == 20
    assert len(kc_detail["key_plays"]) >= 3
    assert len(kc_detail["trivia"]) >= 2
    assert "tactical_analysis" in kc_detail
    assert "Worthy" in kc_detail["tactical_analysis"]["narrative_summary"]


def test_ncaa_season_2026_week_1_marquee(client_multiweek):
    """Verifies Season 2026-2027 NCAA Week 1 Saturday marquee matchups and tactical analyses."""
    resp = client_multiweek.get("/api/games?league=ncaa&season=2026&week=1")
    assert resp.status_code == 200
    games = resp.json()
    assert len(games) == 3

    game_ids = [g["id"] for g in games]
    assert "ncaa_2026_w1_tex_mich" in game_ids
    assert "ncaa_2026_w1_clem_uga" in game_ids
    assert "ncaa_2026_w1_nd_tamu" in game_ids

    # Check Texas @ Michigan detail
    tex_resp = client_multiweek.get("/api/games/ncaa_2026_w1_tex_mich")
    assert tex_resp.status_code == 200
    tex_detail = tex_resp.json()
    assert tex_detail["away_score"] == 31
    assert tex_detail["home_score"] == 12
    assert len(tex_detail["key_plays"]) >= 2
    assert "tactical_analysis" in tex_detail
    assert "Big House" in tex_detail["tactical_analysis"]["headline"]


def test_season_2026_awards_categories(client_multiweek):
    """Verifies preselected award candidates for NFL and NCAA Season 2026 Week 1."""
    nfl_awards = client_multiweek.get("/api/awards?league=nfl&season=2026&week=1").json()
    assert len(nfl_awards) >= 5
    nfl_cats = {a["category"] for a in nfl_awards}
    assert "MVP" in nfl_cats
    assert "OPOW" in nfl_cats
    assert "DPOW" in nfl_cats
    assert "DO" in nfl_cats
    assert "DONT" in nfl_cats

    ncaa_awards = client_multiweek.get("/api/awards?league=ncaa&season=2026&week=1").json()
    assert len(ncaa_awards) >= 5
    ncaa_cats = {a["category"] for a in ncaa_awards}
    assert "MVP" in ncaa_cats
    assert "OPOW" in ncaa_cats
    assert "DPOW" in ncaa_cats

