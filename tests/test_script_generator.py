"""Unit tests for YouTube Script & Teleprompter Generator."""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from api.main import app
from processing import script_generator
from mock import dataset


def test_calculate_estimated_duration():
    """Verifies duration calculation based on standard reading speed."""
    sample_text = " ".join(["football"] * 260)  # 260 words ~ 2 minutes
    meta = script_generator.calculate_estimated_duration(sample_text, words_per_minute=130)
    assert meta["word_count"] == 260
    assert meta["estimated_minutes"] == 2.0
    assert "2m" in meta["duration_formatted"]


def test_build_youtube_script(tmp_path: Path):
    """Verifies the structural completeness of the generated YouTube script."""
    test_db = tmp_path / "test_scripts.db"
    dataset.seed_mock_environment(custom_db_path=test_db)

    result = script_generator.build_youtube_script(
        league="nfl",
        season=2024,
        week=11,
        custom_db_path=test_db
    )

    assert result["league"] == "nfl"
    assert result["week"] == 11
    assert len(result["suggested_titles"]) >= 3
    assert result["metadata"]["word_count"] > 200

    md = result["script_markdown"]
    # Verify all required blocks exist
    assert "BLOQUE 1: EL GANCHO" in md
    assert "BLOQUE 2: EL PARTIDO DE LA SEMANA" in md
    assert "BLOQUE 4: PREMIOS DE LA SEMANA" in md
    assert "BLOQUE 5: LOS DOs Y LOS DON'Ts" in md
    assert "BLOQUE 6: CIERRE" in md


def test_api_script_generation_endpoint(tmp_path: Path, monkeypatch):
    """Verifies GET /api/scripts/generate returns 200 with script payload."""
    test_db = tmp_path / "test_api_script.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{test_db}")
    dataset.seed_mock_environment(custom_db_path=test_db)

    from security.auth import create_session_token
    token = create_session_token("script_admin")

    with TestClient(app) as client:
        resp = client.get(
            "/api/scripts/generate?league=nfl&season=2024&week=11",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "script_markdown" in data
        assert "metadata" in data
        assert data["week"] == 11

