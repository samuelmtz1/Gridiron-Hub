"""Unit tests for Gridiron Hub Staging Mock Preview dataset and environment."""

import pytest
from pathlib import Path
from mock import dataset
from storage import db


def test_seed_mock_environment(tmp_path: Path):
    """Verifies that seed_mock_environment completely populates a fresh database."""
    test_db = tmp_path / "test_mock.db"
    dataset.seed_mock_environment(custom_db_path=test_db)

    # Verify games
    games = db.get_games_by_week("nfl", 2024, 11, custom_path=test_db)
    assert len(games) == 4
    chiefs_bills = next((g for g in games if g["id"] == "nfl_2024_w11_kc_buf"), None)
    assert chiefs_bills is not None
    assert chiefs_bills["home_score"] == 30
    assert chiefs_bills["away_score"] == 21

    # Verify NCAA games
    ncaa_games = db.get_games_by_week("ncaa", 2024, 11, custom_path=test_db)
    assert len(ncaa_games) == 3
    ala_game = next((g for g in ncaa_games if g["home_code"] == "ALA"), None)
    assert ala_game is not None

    # Verify game details with key plays and trivia
    details = db.get_game_details("nfl_2024_w11_kc_buf", custom_path=test_db)
    assert details is not None
    assert len(details["key_plays"]) >= 2
    assert len(details["trivia"]) >= 2

    # Verify Awards
    awards = db.get_awards("nfl", 2024, 11, custom_path=test_db)
    categories = {a["category"] for a in awards}
    assert {"MVP", "OPOW", "DPOW", "SPECIAL_TEAMS", "DO", "DONT"}.issubset(categories)


def test_frontend_static_assets_exist():
    """Verifies the presence and integrity of the frontend dashboard files."""
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    assert (frontend_dir / "index.html").exists()
    assert (frontend_dir / "style.css").exists()
    assert (frontend_dir / "app.js").exists()
    assert (frontend_dir / "design-tokens" / "tokens.css").exists()
