"""Integration tests for Gridiron Hub FastAPI endpoints."""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from api.main import app
from security.auth import create_session_token
from storage import db


@pytest.fixture
def auth_headers():
    """Generates valid Bearer authentication headers for test client."""
    token = create_session_token("test_user")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client_with_db(tmp_path: Path, monkeypatch):
    """Sets up an isolated test database and returns a TestClient."""
    test_db = tmp_path / "test_api.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{test_db}")
    db.init_db(custom_path=test_db)

    # Seed teams
    from ingestion import assets_source
    db.save_teams(assets_source.load_all_teams(), custom_path=test_db)

    # Insert a sample game
    db.save_games([
        {
            "id": "nfl_2024_w10_den_kc",
            "league": "nfl",
            "season": 2024,
            "season_type": "regular",
            "week": 10,
            "game_date": "2024-11-10",
            "home_team_id": "nfl_KC",
            "away_team_id": "nfl_DEN",
            "home_score": 16,
            "away_score": 14,
            "status": "final",
            "venue": "Arrowhead Stadium",
            "weather_temp": 55,
            "weather_desc": "Despejado",
            "highlight_url": "https://youtube.com/mock_kc",
        }
    ], custom_path=test_db)

    # Insert a sample award
    db.save_awards_candidates([
        {
            "id": "award_1",
            "league": "nfl",
            "season": 2024,
            "week": 10,
            "category": "MVP",
            "candidate_name": "Patrick Mahomes",
            "team_id": "nfl_KC",
            "stat_summary": "16-14 W, +12.4 EPA",
            "metric_value": 12.4,
            "clip_url": "https://youtube.com/clip1",
            "rank": 1,
        }
    ], custom_path=test_db)

    with TestClient(app) as client:
        yield client


def test_root_endpoint(client_with_db):
    """Verifies that GET / returns 200 and service metadata."""
    resp = client_with_db.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert data["service"] == "Gridiron Hub API"


def test_health_endpoint(client_with_db):
    """Verifies that /health returns 200 and healthy status (public endpoint)."""
    resp = client_with_db.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["total_teams"] >= 32


def test_list_teams_filtered_by_conference(client_with_db):
    """Verifies /api/teams filters by conference (public directory)."""
    resp = client_with_db.get("/api/teams?league=nfl&conference=AFC")
    assert resp.status_code == 200
    teams = resp.json()
    assert len(teams) == 16
    for t in teams:
        assert t["conference"] == "AFC"
        assert t["primary_color"].startswith("#")


def test_unauthenticated_requests_rejected(client_with_db):
    """Verifies that protected endpoints return 401 Unauthorized without auth headers."""
    resp = client_with_db.get("/api/games?league=nfl&season=2024&week=10")
    assert resp.status_code == 401

    resp_awards = client_with_db.get("/api/awards?league=nfl&season=2024&week=10")
    assert resp_awards.status_code == 401


def test_list_games_by_week(client_with_db, auth_headers):
    """Verifies /api/games returns games matching season and week when authenticated."""
    resp = client_with_db.get("/api/games?league=nfl&season=2024&week=10", headers=auth_headers)
    assert resp.status_code == 200
    games = resp.json()
    assert len(games) >= 1
    sample_game = next((g for g in games if g["id"] == "nfl_2024_w10_den_kc"), None)
    assert sample_game is not None
    assert sample_game["home_code"] == "KC"
    assert sample_game["away_code"] == "DEN"


def test_get_game_details_success(client_with_db, auth_headers):
    """Verifies /api/games/{id} returns full game details when authenticated."""
    resp = client_with_db.get("/api/games/nfl_2024_w10_den_kc", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["venue"] == "Arrowhead Stadium"
    assert "key_plays" in data
    assert "trivia" in data


def test_get_game_details_not_found(client_with_db, auth_headers):
    """Verifies 404 response for unknown game ID when authenticated."""
    resp = client_with_db.get("/api/games/nfl_unknown_game", headers=auth_headers)
    assert resp.status_code == 404


def test_list_awards(client_with_db, auth_headers):
    """Verifies /api/awards returns weekly candidates when authenticated."""
    resp = client_with_db.get("/api/awards?league=nfl&season=2024&week=10", headers=auth_headers)
    assert resp.status_code == 200
    awards = resp.json()
    assert len(awards) == 1
    assert awards[0]["candidate_name"] == "Patrick Mahomes"
    assert awards[0]["category"] == "MVP"
