"""Tests for Tactical Deep Research Analysis & Ficha de Juego integration."""

import pytest
from pathlib import Path
from storage import db
from mock import dataset
from processing import script_generator
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture
def temp_test_db(tmp_path: Path):
    """Initializes a fresh SQLite database seeded with mock tactical analysis."""
    test_db = tmp_path / "test_tactical.db"
    dataset.seed_mock_environment(custom_db_path=test_db)
    return test_db


def test_tactical_analysis_storage_and_retrieval(temp_test_db: Path):
    """Verifies that tactical analysis can be stored and retrieved with parsed JSON fields."""
    game_id = "nfl_2024_w11_kc_buf"
    analysis = db.get_game_tactical_analysis(game_id, custom_path=temp_test_db)

    assert analysis is not None
    assert "headline" in analysis
    assert "Defensive Mastery" in analysis["headline"]
    assert "narrative_summary" in analysis

    # Verify structured JSON lists
    assert isinstance(analysis["historic_facts"], list)
    assert len(analysis["historic_facts"]) > 0
    assert "title" in analysis["historic_facts"][0]

    assert isinstance(analysis["award_deep_dives"], list)
    assert len(analysis["award_deep_dives"]) > 0
    assert "role" in analysis["award_deep_dives"][0]
    assert "bullets" in analysis["award_deep_dives"][0]

    assert isinstance(analysis["tactical_dos_donts"], list)
    assert len(analysis["tactical_dos_donts"]) > 0
    assert analysis["tactical_dos_donts"][0]["type"] in ("DO", "DONT")


def test_game_details_includes_tactical_analysis(temp_test_db: Path):
    """Verifies that db.get_game_details enriches the response with tactical_analysis."""
    game_id = "nfl_2024_w11_kc_buf"
    details = db.get_game_details(game_id, custom_path=temp_test_db)

    assert details is not None
    assert "tactical_analysis" in details
    assert details["tactical_analysis"] is not None
    assert details["tactical_analysis"]["game_id"] == game_id


def test_api_game_details_and_tactical_endpoint(temp_test_db: Path, monkeypatch):
    """Verifies the FastAPI endpoints return tactical analysis for authenticated team members."""
    from security.auth import create_session_token

    monkeypatch.setattr(db, "DEFAULT_DB_PATH", temp_test_db)
    client = TestClient(app)
    token = create_session_token("producer_user")
    headers = {"Authorization": f"Bearer {token}"}

    game_id = "nfl_2024_w11_kc_buf"

    # 1. Game detail enriched endpoint
    res = client.get(f"/api/games/{game_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "tactical_analysis" in data
    assert data["tactical_analysis"]["headline"].startswith("Defensive Mastery")

    # 2. Dedicated tactical analysis endpoint
    res_tactical = client.get(f"/api/games/{game_id}/tactical-analysis", headers=headers)
    assert res_tactical.status_code == 200
    t_data = res_tactical.json()
    assert t_data["game_id"] == game_id
    assert len(t_data["tactical_dos_donts"]) >= 4


def test_youtube_script_incorporates_tactical_analysis(temp_test_db: Path):
    """Verifies that the generated YouTube script contains the tactical narrative, facts, and DOs/DON'Ts."""
    script_data = script_generator.build_youtube_script(
        league="nfl", season=2024, week=11, custom_db_path=temp_test_db
    )

    md = script_data["script_markdown"]
    assert "Análisis Táctico Deep Research" in md
    assert "Hitos y Cifras Históricas" in md
    assert "Matriz de Decisiones Tácticas" in md
    assert "| 🟢 DO |" in md or "| 🔴 DON'T |" in md
