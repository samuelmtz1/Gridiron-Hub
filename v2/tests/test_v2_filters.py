"""Tests for Division and Conference Filtering (Gridiron Hub 2.0)."""

from v2.ingestion.assets_engine import NFL_TEAMS, NCAA_TEAMS


def matches_division_logic(game, div_filter: str) -> bool:
    """Python reference implementation of the frontend matchesDivision function."""
    if not div_filter or div_filter == "ALL":
        return True

    h_conf = (game.get("home_conference") or "").upper()
    a_conf = (game.get("away_conference") or "").upper()
    h_div = (game.get("home_division") or "").upper()
    a_div = (game.get("away_division") or "").upper()
    target = div_filter.upper()

    if target in (h_conf, a_conf):
        return True

    if target.startswith("AFC ") or target.startswith("NFC "):
        parts = target.split(" ", 1)
        conf = parts[0]
        div = parts[1]
        return (h_conf == conf and h_div == div) or (a_conf == conf and a_div == div)

    return h_div == target or a_div == target


def test_nfl_division_filtering():
    kc_game = {
        "home_code": "KC",
        "home_conference": "AFC",
        "home_division": "West",
        "away_code": "BUF",
        "away_conference": "AFC",
        "away_division": "East",
    }

    chi_game = {
        "home_code": "CHI",
        "home_conference": "NFC",
        "home_division": "North",
        "away_code": "GB",
        "away_conference": "NFC",
        "away_division": "North",
    }

    # Test ALL
    assert matches_division_logic(kc_game, "ALL") is True
    assert matches_division_logic(chi_game, "ALL") is True

    # Test Conference
    assert matches_division_logic(kc_game, "AFC") is True
    assert matches_division_logic(kc_game, "NFC") is False
    assert matches_division_logic(chi_game, "NFC") is True
    assert matches_division_logic(chi_game, "AFC") is False

    # Test NFL Divisions
    assert matches_division_logic(kc_game, "AFC West") is True
    assert matches_division_logic(kc_game, "AFC East") is True
    assert matches_division_logic(kc_game, "AFC North") is False
    assert matches_division_logic(chi_game, "NFC North") is True
    assert matches_division_logic(chi_game, "NFC South") is False


def test_ncaa_conference_filtering():
    sec_game = {
        "home_code": "ALA",
        "home_conference": "SEC",
        "away_code": "UGA",
        "away_conference": "SEC",
    }

    big10_game = {
        "home_code": "OSU",
        "home_conference": "Big Ten",
        "away_code": "MICH",
        "away_conference": "Big Ten",
    }

    assert matches_division_logic(sec_game, "SEC") is True
    assert matches_division_logic(sec_game, "Big Ten") is False
    assert matches_division_logic(big10_game, "Big Ten") is True
    assert matches_division_logic(big10_game, "SEC") is False
