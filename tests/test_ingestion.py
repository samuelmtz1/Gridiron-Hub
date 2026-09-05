"""Unit tests for Gridiron Hub Ingestion Layer."""

import pytest
from ingestion import assets_source, live_trigger, nfl_source, cfb_source


def test_assets_source_nfl_teams_completeness():
    """Verifies that all 32 NFL teams have valid codes, colors, and SVG logo links."""
    teams = assets_source.NFL_TEAMS
    assert len(teams) == 32

    for t in teams:
        assert t["league"] == "nfl"
        assert t["code"] is not None
        assert t["primary_color"].startswith("#")
        assert t["secondary_color"].startswith("#")
        assert t["logo_url"].endswith((".png", ".svg"))
        assert t["conference"] in ["AFC", "NFC"]
        assert t["division"] in ["East", "North", "South", "West"]


def test_assets_source_get_team_by_code():
    """Verifies fetching specific team metadata."""
    kc = assets_source.get_team_by_code("KC", league="nfl")
    assert kc is not None
    assert kc["name"] == "Kansas City Chiefs"
    assert kc["primary_color"] == "#E31837"

    ala = assets_source.get_team_by_code("ALA", league="ncaa")
    assert ala is not None
    assert ala["name"] == "Alabama Crimson Tide"


def test_live_trigger_parse_scoreboard():
    """Verifies parsing of ESPN scoreboard JSON events into normalized game records."""
    mock_espn_payload = {
        "season": {"year": 2024},
        "week": {"number": 10},
        "events": [
            {
                "id": "401671800",
                "date": "2024-11-10T21:25Z",
                "competitions": [
                    {
                        "status": {"type": {"name": "STATUS_FINAL", "completed": True}},
                        "venue": {"fullName": "Arrowhead Stadium"},
                        "weather": {"temperature": 55, "displayValue": "Despejado"},
                        "competitors": [
                            {"homeAway": "home", "team": {"abbreviation": "KC"}, "score": "16"},
                            {"homeAway": "away", "team": {"abbreviation": "DEN"}, "score": "14"},
                        ],
                    }
                ],
            }
        ],
    }

    parsed = live_trigger.parse_scoreboard_events(mock_espn_payload, league="nfl")
    assert len(parsed) == 1
    game = parsed[0]
    assert game["id"] == "nfl_2024_w10_den_kc"
    assert game["home_score"] == 16
    assert game["away_score"] == 14
    assert game["status"] == "final"
    assert game["venue"] == "Arrowhead Stadium"
    assert game["weather_temp"] == 55


def test_nfl_source_wp_swing_calculation():
    """Verifies Win Probability swing arithmetic and precision."""
    swing = nfl_source.compute_wp_swing(0.45, 0.88)
    assert swing == 0.43

    swing_none = nfl_source.compute_wp_swing(None, 0.5)
    assert swing_none == 0.0


def test_nfl_source_extract_key_plays():
    """Verifies ranking and selection of high-impact plays (high WP swing / EPA)."""
    plays = [
        {
            "id": "p1",
            "description": "Pase corto de 3 yardas",
            "epa": 0.1,
            "wp_before": 0.50,
            "wp_after": 0.51,
        },
        {
            "id": "p2",
            "description": "Intercepción devuelta para touchdown",
            "epa": 6.8,
            "wp_before": 0.40,
            "wp_after": 0.92,
        },
        {
            "id": "p3",
            "description": "Fumble recuperado en zona roja",
            "epa": -4.5,
            "wp_before": 0.70,
            "wp_after": 0.35,
        },
    ]

    top_plays = nfl_source.extract_key_plays(plays, top_n=2)
    assert len(top_plays) == 2
    # The interception should rank highest
    assert top_plays[0]["id"] == "p2"
    assert top_plays[1]["id"] == "p3"


def test_cfb_source_graceful_missing_key():
    """Verifies that CFBD gracefully handles absent API keys without exceptions."""
    games = cfb_source.fetch_cfb_games(year=2024, week=1)
    assert isinstance(games, list)
