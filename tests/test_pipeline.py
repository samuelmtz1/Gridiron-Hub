"""Integration tests for Gridiron Hub Ingestion Pipeline and Admin Trigger."""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from api.main import app
from ingestion.pipeline import run_pipeline
from storage import db
from mock import dataset


def test_pipeline_execution(tmp_path: Path):
    """Verifies that run_pipeline executes the full post-game pipeline cleanly."""
    test_db = tmp_path / "test_pipeline.db"

    # Pre-seed some mock games in the test database so pipeline has games to process
    dataset.seed_mock_environment(custom_db_path=test_db)

    result = run_pipeline(
        league="nfl",
        season=2024,
        week=11,
        custom_db_path=test_db
    )

    assert result["status"] == "success"
    assert result["league"] == "nfl"
    assert result["games_processed"] >= 4
    assert result["awards_generated"] >= 5


def test_api_trigger_ingestion_endpoint(tmp_path: Path, monkeypatch):
    """Verifies POST /api/ingest/run triggers pipeline via REST API."""
    test_db = tmp_path / "test_api_ingest.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{test_db}")
    dataset.seed_mock_environment(custom_db_path=test_db)

    with TestClient(app) as client:
        resp = client.post(
            "/api/ingest/run",
            json={"league": "nfl", "season": 2024, "week": 11, "force": False}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
