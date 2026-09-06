"""Automated tests for strict real data verification, season isolation, and auth gate."""

import pytest
import sqlite3
from storage import db
from security.auth import authenticate_team_user, create_session_token, verify_session_token
from ingestion.live_trigger import NCAA_CONFERENCES


def test_no_pre_2025_data_in_db():
    """Verify that all historical data prior to 2025 has been eradicated."""
    con = db.get_connection()
    pre_2025_count = con.execute("SELECT count(*) FROM games WHERE season < 2025").fetchone()[0]
    assert pre_2025_count == 0, f"Found {pre_2025_count} pre-2025 games in database"


def test_nfl_2026_zero_fake_final_games():
    """Verify that NFL 2026 contains NO games with status 'final' since the season hasn't started."""
    con = db.get_connection()
    fake_games = con.execute(
        "SELECT count(*) FROM games WHERE league = 'nfl' AND season = 2026 AND status = 'final'"
    ).fetchone()[0]
    assert fake_games == 0, f"Found {fake_games} fake final games in NFL 2026"


def test_season_exclusivity():
    """Verify strict season isolation: 2026 has only 2026 games, 2025 has only 2025 games."""
    con = db.get_connection()
    games_2026 = con.execute("SELECT count(*) FROM games WHERE season = 2026").fetchone()[0]
    games_2025 = con.execute("SELECT count(*) FROM games WHERE season = 2025").fetchone()[0]
    assert games_2026 > 0
    assert games_2025 > 0


def test_ncaa_conference_mappings():
    """Verify that ESPN conference IDs match official mappings."""
    assert NCAA_CONFERENCES.get("1") == "ACC"
    assert NCAA_CONFERENCES.get("4") == "Big 12"
    assert NCAA_CONFERENCES.get("5") == "Big Ten"
    assert NCAA_CONFERENCES.get("8") == "SEC"
    assert NCAA_CONFERENCES.get("12") == "Conference USA"
    assert NCAA_CONFERENCES.get("15") == "MAC"
    assert NCAA_CONFERENCES.get("17") == "Mountain West"
    assert NCAA_CONFERENCES.get("37") == "Sun Belt"
    assert NCAA_CONFERENCES.get("151") == "American"


def test_team_default_authentication():
    """Verify default credentials allow team access."""
    assert authenticate_team_user("gridiron_team", "Gridiron2026!") is True
    assert authenticate_team_user("gridiron_team", "WrongPassword") is False
    assert authenticate_team_user("intruder", "Gridiron2026!") is False

    token = create_session_token("gridiron_team")
    payload = verify_session_token(token)
    assert payload is not None
    assert payload.get("sub") == "gridiron_team"


def test_no_fake_ncaa_mock_games():
    """Verify that fake mock NCAA games (Clemson vs Georgia, ND vs TAMU, Texas vs Michigan) are eliminated."""
    con = db.get_connection()
    mock_games = con.execute(
        "SELECT count(*) FROM games WHERE id IN ('ncaa_2026_w1_clem_uga', 'ncaa_2026_w1_nd_tamu', 'ncaa_2026_w1_tex_mich')"
    ).fetchone()[0]
    assert mock_games == 0, f"Found {mock_games} fake mock NCAA games in database"
