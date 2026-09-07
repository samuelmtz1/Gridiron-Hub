"""Automated tests for strict real data verification, season isolation, and auth gate."""

import pytest
import sqlite3
from storage import db
from security.auth import authenticate_team_user, create_session_token, verify_session_token
from ingestion.live_trigger import NCAA_CONFERENCES


def test_no_pre_2026_data_in_db():
    """Verify that all historical data prior to 2026 has been eradicated per user instructions."""
    con = db.get_connection()
    pre_2026_count = con.execute("SELECT count(*) FROM games WHERE season < 2026").fetchone()[0]
    assert pre_2026_count == 0, f"Found {pre_2026_count} pre-2026 games in database"


def test_nfl_2026_zero_fake_final_games():
    """Verify that NFL 2026 contains NO games with status 'final' since the season hasn't started."""
    con = db.get_connection()
    fake_games = con.execute(
        "SELECT count(*) FROM games WHERE league = 'nfl' AND season = 2026 AND status = 'final'"
    ).fetchone()[0]
    assert fake_games == 0, f"Found {fake_games} fake final games in NFL 2026"


def test_season_exclusivity():
    """Verify strict season isolation: only 2026+ games exist in active database."""
    con = db.get_connection()
    games_2026 = con.execute("SELECT count(*) FROM games WHERE season = 2026").fetchone()[0]
    games_pre_2026 = con.execute("SELECT count(*) FROM games WHERE season < 2026").fetchone()[0]
    assert games_2026 > 0
    assert games_pre_2026 == 0


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


def test_ncaa_game_stats_and_event_id_coverage():
    """Verify that all completed NCAA games have an event_id and registered team stats."""
    con = db.get_connection()
    # All final games must have event_id
    games_without_eid = con.execute(
        "SELECT count(*) FROM games WHERE league = 'ncaa' AND status = 'final' AND (event_id IS NULL OR event_id = '')"
    ).fetchone()[0]
    assert games_without_eid == 0, f"Found {games_without_eid} NCAA games without event_id"

    # All final games must have team_stats (at least 2 per game)
    games_without_stats = con.execute("""
        SELECT count(*) FROM games g
        WHERE g.league = 'ncaa' AND g.status = 'final'
          AND (SELECT count(*) FROM game_team_stats s WHERE s.game_id = g.id) < 2
    """).fetchone()[0]
    assert games_without_stats == 0, f"Found {games_without_stats} NCAA final games with missing team stats"


def test_ncaa_louisville_ole_miss_boxscore_and_epa():
    """Verify Louisville @ Ole Miss has authentic yardage, third downs, and calculated EPA."""
    con = db.get_connection()
    stats = con.execute(
        "SELECT * FROM game_team_stats WHERE game_id = 'ncaa_2026_w1_lou_miss' ORDER BY is_home ASC"
    ).fetchall()
    assert len(stats) == 2, "Expected 2 team stats for Louisville vs Ole Miss"

    away = dict(stats[0])  # Louisville
    home = dict(stats[1])  # Ole Miss

    assert away["total_yards"] == 469
    assert away["passing_yards"] == 307
    assert away["rushing_yards"] == 162
    assert away["third_down_comp"] == 7
    assert away["third_down_att"] == 16
    assert away["epa_total"] > 0

    assert home["total_yards"] == 488
    assert home["passing_yards"] == 336
    assert home["rushing_yards"] == 152
    assert home["turnovers"] == 2
    assert home["third_down_comp"] == 6
    assert home["third_down_att"] == 16
    assert home["epa_total"] > 0

