"""Integration Tests for FastAPI v2 Endpoints."""

import pytest
from fastapi.testclient import TestClient

from v2.api.main import app
from v2.security.auth import hash_password, save_user
from v2.storage import db


@pytest.fixture
def client(tmp_path):
    test_db = tmp_path / "test_api.db"
    test_auth = tmp_path / "test_auth.db"

    db.init_db(custom_path=test_db)
    from v2.ingestion.assets_engine import NFL_TEAMS
    db.save_teams(NFL_TEAMS, custom_path=test_db)

    # Save a test game
    game = {
        "id": "nfl_2026_01_kc_lac",
        "league": "nfl",
        "season": 2026,
        "season_type": "regular",
        "week": 1,
        "game_date": "2026-09-10T20:20:00Z",
        "home_team_id": "nfl_LAC",
        "away_team_id": "nfl_KC",
        "home_score": 21,
        "away_score": 28,
        "status": "final",
        "venue": "SoFi Stadium",
        "event_id": "401671780",
    }
    db.save_games([game], custom_path=test_db)

    # Save test team stats
    db.save_game_team_stats([
        {
            "id": "stat_1",
            "game_id": "nfl_2026_01_kc_lac",
            "team_id": "nfl_KC",
            "is_home": 0,
            "total_yards": 380,
            "passing_yards": 290,
            "rushing_yards": 90,
            "turnovers": 0,
            "epa_total": 5.4,
            "epa_pass": 4.2,
            "epa_rush": 1.2,
            "third_down_comp": 7,
            "third_down_att": 12,
            "red_zone_comp": 3,
            "red_zone_att": 3,
            "time_of_possession": "32:10",
        }
    ], custom_path=test_db)

    # Register an authorized test user in test_auth
    save_user("test_sam", hash_password("SamPassword2026!"), role="admin", db_path=test_auth)

    with TestClient(app) as c:
        yield c, test_auth


def test_api_root_and_health(client):
    c, _ = client
    res = c.get("/")
    assert res.status_code == 200
    assert res.json()["system"] == "Gridiron Hub 2.0"

    health = c.get("/api/v2/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_unauthenticated_requests_rejected(client):
    c, _ = client
    res = c.get("/api/v2/games?league=nfl&season=2026&week=1")
    assert res.status_code == 401


def test_login_flow_and_authenticated_games_query(client, monkeypatch):
    c, test_auth = client

    # Point auth to test auth DB
    from v2.security import auth
    monkeypatch.setattr(auth, "AUTH_DB_PATH", test_auth)

    # 1. Login with invalid credentials
    bad_login = c.post("/api/v2/auth/login", json={"username": "test_sam", "password": "WrongPassword"})
    assert bad_login.status_code == 401

    # 2. Login with valid credentials
    good_login = c.post("/api/v2/auth/login", json={"username": "test_sam", "password": "SamPassword2026!"})
    assert good_login.status_code == 200
    token = good_login.json()["token"]
    assert token is not None

    # 3. Access games with token
    headers = {"X-Session-Token": token}
    games_res = c.get("/api/v2/games?league=nfl&season=2026&week=1", headers=headers)
    assert games_res.status_code == 200
    games = games_res.json()
    assert isinstance(games, list)

    # 4. Verify token
    verify_res = c.get("/api/v2/auth/verify", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["user"] == "test_sam"


def test_frontend_static_serving(client):
    c, _ = client
    # When browser requests root with Accept: text/html
    res = c.get("/", headers={"Accept": "text/html,application/xhtml+xml"})
    assert res.status_code == 200
    assert "Gridiron Hub 2.0" in res.text
    assert "pitch-black" in res.text or "lookbook" in res.text or "gridiron" in res.text.lower()


def test_vercel_serverless_login_file():
    from pathlib import Path
    login_js = Path(__file__).resolve().parent.parent.parent / "api" / "v2" / "auth" / "login.js"
    assert login_js.exists(), "api/v2/auth/login.js debe existir para el runtime de Vercel"
    content = login_js.read_text(encoding="utf-8")
    assert "GRIDIRON_USERS_JSON" in content
    assert "crypto.pbkdf2Sync" in content
    assert "crypto.timingSafeEqual" in content

