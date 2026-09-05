"""Unit tests for Gridiron Hub Processing Layer (Awards, Highlights, Trivia)."""

import pytest
from processing import awards_engine, highlight_selector, trivia_engine


@pytest.fixture
def sample_players():
    return [
        {
            "id": "p_mahomes",
            "player_name": "Patrick Mahomes",
            "team_id": "nfl_KC",
            "position": "QB",
            "epa_total": 18.5,
            "epa_pass": 16.2,
            "epa_rush": 2.3,
            "pass_yards": 320,
            "pass_td": 3,
            "rush_yards": 28,
            "rush_td": 0,
        },
        {
            "id": "p_allen",
            "player_name": "Josh Allen",
            "team_id": "nfl_BUF",
            "position": "QB",
            "epa_total": 21.4,
            "epa_pass": 15.0,
            "epa_rush": 6.4,
            "pass_yards": 280,
            "pass_td": 2,
            "rush_yards": 62,
            "rush_td": 2,
        },
        {
            "id": "p_watt",
            "player_name": "T.J. Watt",
            "team_id": "nfl_PIT",
            "position": "LB",
            "epa_total": 0.0,
            "epa_defense": -8.5,
            "sacks": 3.0,
            "interceptions": 1,
            "tackles": 7,
        },
    ]


@pytest.fixture
def sample_plays():
    return [
        {
            "id": "play_01",
            "game_id": "g1",
            "quarter": 4,
            "time_remaining": "01:15",
            "possession_team_id": "nfl_KC",
            "play_type": "pass",
            "description": "Pase profundo de 45 yds para TOUCHDOWN de la victoria.",
            "epa": 4.8,
            "wp_before": 0.42,
            "wp_after": 0.94,
            "wp_swing": 0.52,
            "is_touchdown": 1,
            "is_turnover": 0,
        },
        {
            "id": "play_02",
            "game_id": "g1",
            "quarter": 2,
            "time_remaining": "08:30",
            "possession_team_id": "nfl_BUF",
            "play_type": "interception",
            "description": "Pase interceptado en la yarda 5 rival y devuelto 40 yardas.",
            "epa": -5.2,
            "wp_before": 0.65,
            "wp_after": 0.38,
            "wp_swing": 0.27,
            "is_touchdown": 0,
            "is_turnover": 1,
        },
        {
            "id": "play_03",
            "game_id": "g1",
            "quarter": 1,
            "time_remaining": "12:00",
            "possession_team_id": "nfl_KC",
            "play_type": "run",
            "description": "Acarreo por la banda de 3 yardas.",
            "epa": 0.1,
            "wp_before": 0.50,
            "wp_after": 0.51,
            "wp_swing": 0.01,
            "is_touchdown": 0,
            "is_turnover": 0,
        },
        {
            "id": "play_04",
            "game_id": "g1",
            "quarter": 4,
            "time_remaining": "00:03",
            "possession_team_id": "nfl_BUF",
            "play_type": "field_goal",
            "description": "Gol de campo de 54 yardas bloqueado en la última jugada.",
            "epa": -3.8,
            "wp_before": 0.45,
            "wp_after": 0.00,
            "wp_swing": 0.45,
            "is_touchdown": 0,
            "is_turnover": 0,
        },
    ]


def test_awards_engine_opow(sample_players):
    """Verifies that OPOW correctly selects the player with highest offensive EPA."""
    candidates = awards_engine.select_opow_candidates(sample_players, top_n=2)
    assert len(candidates) == 2
    # Josh Allen (+21.4 EPA) should be rank 1
    assert candidates[0]["candidate_name"] == "Josh Allen"
    assert candidates[0]["rank"] == 1
    assert "EPA" in candidates[0]["stat_summary"]
    assert "youtube.com" in candidates[0]["clip_url"]


def test_awards_engine_dpow(sample_players):
    """Verifies defensive playmaker ranking based on sacks, INTs, and tackles."""
    dpow = awards_engine.select_dpow_candidates(sample_players, top_n=1)
    assert len(dpow) == 1
    assert dpow[0]["candidate_name"] == "T.J. Watt"
    assert "3.0 Sacks" in dpow[0]["stat_summary"]


def test_awards_engine_dos_and_donts(sample_plays):
    """Verifies DOs (highest EPA) and DON'Ts (lowest EPA) categorization."""
    result = awards_engine.select_dos_and_donts(sample_plays, top_n=1)
    dos = result["dos"]
    donts = result["donts"]

    assert len(dos) == 1
    assert dos[0]["category"] == "DO"
    assert dos[0]["metric_value"] == 4.8  # TD play

    assert len(donts) == 1
    assert donts[0]["category"] == "DONT"
    assert donts[0]["metric_value"] == -5.2  # Costly turnover


def test_highlight_selector_ranking(sample_plays):
    """Verifies selection and formatting of top game highlights."""
    game = {"season": 2024, "home_code": "KC", "away_code": "BUF"}
    highlights = highlight_selector.select_game_highlights(game, sample_plays, max_plays=2)

    assert len(highlights) == 2
    # Play 1 had highest WP swing (0.52)
    assert highlights[0]["wp_swing"] == 0.52
    assert "52.0%" in highlights[0]["wp_swing_pct"]
    assert "youtube.com" in highlights[0]["video_url"]


def test_trivia_engine_generation(sample_plays):
    """Verifies trivia fact generation for close thrillers and 4th quarter comebacks."""
    game = {
        "id": "g1",
        "home_code": "KC",
        "away_code": "BUF",
        "home_short": "Chiefs",
        "away_short": "Bills",
        "home_score": 27,
        "away_score": 24,
        "status": "final",
    }
    team_stats = [{"team_id": "nfl_BUF", "turnovers": 3, "is_home": False}]

    facts = trivia_engine.generate_game_trivia(game, team_stats, sample_plays)
    assert len(facts) >= 2

    # Check for thriller fact (margin <= 3)
    thriller = next((f for f in facts if "Final de una sola posesión" in f["fact_text"]), None)
    assert thriller is not None

    # Check for 4th quarter clutch swing
    clutch = next((f for f in facts if "Remontada en el 4to cuarto" in f["fact_text"]), None)
    assert clutch is not None
