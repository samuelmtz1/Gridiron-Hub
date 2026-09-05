"""Staging Mock Dataset for Gridiron Hub.

Provides a 100% realistic, comprehensive offline dataset emulating a completed
weekend of NFL and NCAA action:
- Marquee matchups (Chiefs @ Bills, Ravens @ Steelers, Lions @ Packers, Alabama @ Georgia)
- High-leverage key plays with authentic Win Probability swings and EPA values
- Advanced boxscores (Passing vs Rushing EPA, Red Zone, 3rd down efficiency)
- Preselected Award Nominees (OPOW, DPOW, MVP, Interception of Week, TD of Week, DOs & DON'Ts)
- Ready-to-read narrative trivia bullet points for YouTube recording scripts
Cost: $0 perpetual.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pathlib import Path
from storage import db
from ingestion import assets_source

SEASON = 2024
WEEK = 11


def get_mock_games() -> List[Dict[str, Any]]:
    """Returns realistic completed games for Week 11."""
    return [
        {
            "id": "nfl_2024_w11_kc_buf",
            "league": "nfl",
            "season": SEASON,
            "season_type": "regular",
            "week": WEEK,
            "game_date": "2024-11-17T21:25:00Z",
            "home_team_id": "nfl_BUF",
            "away_team_id": "nfl_KC",
            "home_score": 30,
            "away_score": 21,
            "status": "final",
            "venue": "Highmark Stadium",
            "weather_temp": 46,
            "weather_desc": "Nublado, Viento 12 mph",
            "highlight_url": "https://www.youtube.com/results?search_query=Chiefs+vs+Bills+Week+11+2024+highlights",
        },
        {
            "id": "nfl_2024_w11_bal_pit",
            "league": "nfl",
            "season": SEASON,
            "season_type": "regular",
            "week": WEEK,
            "game_date": "2024-11-17T18:00:00Z",
            "home_team_id": "nfl_PIT",
            "away_team_id": "nfl_BAL",
            "home_score": 18,
            "away_score": 16,
            "status": "final",
            "venue": "Acrisure Stadium",
            "weather_temp": 52,
            "weather_desc": "Despejado",
            "highlight_url": "https://www.youtube.com/results?search_query=Ravens+vs+Steelers+Week+11+2024+highlights",
        },
        {
            "id": "nfl_2024_w11_gb_chi",
            "league": "nfl",
            "season": SEASON,
            "season_type": "regular",
            "week": WEEK,
            "game_date": "2024-11-17T18:00:00Z",
            "home_team_id": "nfl_CHI",
            "away_team_id": "nfl_GB",
            "home_score": 19,
            "away_score": 20,
            "status": "final",
            "venue": "Soldier Field",
            "weather_temp": 48,
            "weather_desc": "Viento racheado 18 mph",
            "highlight_url": "https://www.youtube.com/results?search_query=Packers+vs+Bears+Week+11+2024+highlights",
        },
        {
            "id": "nfl_2024_w11_det_jax",
            "league": "nfl",
            "season": SEASON,
            "season_type": "regular",
            "week": WEEK,
            "game_date": "2024-11-17T18:00:00Z",
            "home_team_id": "nfl_DET",
            "away_team_id": "nfl_JAX",
            "home_score": 52,
            "away_score": 6,
            "status": "final",
            "venue": "Ford Field (Domo)",
            "weather_temp": 70,
            "weather_desc": "Clima controlado",
            "highlight_url": "https://www.youtube.com/results?search_query=Jaguars+vs+Lions+Week+11+2024+highlights",
        },
        {
            "id": "ncaa_2024_w11_uga_ala",
            "league": "ncaa",
            "season": SEASON,
            "season_type": "regular",
            "week": WEEK,
            "game_date": "2024-11-16T23:30:00Z",
            "home_team_id": "ncaa_ALA",
            "away_team_id": "ncaa_UGA",
            "home_score": 41,
            "away_score": 34,
            "status": "final",
            "venue": "Bryant-Denny Stadium",
            "weather_temp": 64,
            "weather_desc": "Noche despejada",
            "highlight_url": "https://www.youtube.com/results?search_query=Georgia+vs+Alabama+2024+highlights",
        },
    ]


def get_mock_game_team_stats() -> List[Dict[str, Any]]:
    """Returns advanced team boxscore metrics for Week 11."""
    return [
        # Chiefs vs Bills
        {
            "id": "stat_kc_w11",
            "game_id": "nfl_2024_w11_kc_buf",
            "team_id": "nfl_KC",
            "is_home": False,
            "total_yards": 259,
            "passing_yards": 196,
            "rushing_yards": 63,
            "turnovers": 2,
            "epa_total": -3.2,
            "epa_pass": -0.8,
            "epa_rush": -2.4,
            "third_down_comp": 5,
            "third_down_att": 10,
            "red_zone_comp": 3,
            "red_zone_att": 3,
            "time_of_possession": "27:14",
        },
        {
            "id": "stat_buf_w11",
            "game_id": "nfl_2024_w11_kc_buf",
            "team_id": "nfl_BUF",
            "is_home": True,
            "total_yards": 366,
            "passing_yards": 262,
            "rushing_yards": 104,
            "turnovers": 1,
            "epa_total": 14.8,
            "epa_pass": 9.4,
            "epa_rush": 5.4,
            "third_down_comp": 9,
            "third_down_att": 15,
            "red_zone_comp": 3,
            "red_zone_att": 4,
            "time_of_possession": "32:46",
        },
        # Ravens vs Steelers
        {
            "id": "stat_bal_w11",
            "game_id": "nfl_2024_w11_bal_pit",
            "team_id": "nfl_BAL",
            "is_home": False,
            "total_yards": 329,
            "passing_yards": 205,
            "rushing_yards": 124,
            "turnovers": 3,
            "epa_total": -6.4,
            "epa_pass": -3.1,
            "epa_rush": -3.3,
            "third_down_comp": 4,
            "third_down_att": 11,
            "red_zone_comp": 1,
            "red_zone_att": 3,
            "time_of_possession": "23:38",
        },
        {
            "id": "stat_pit_w11",
            "game_id": "nfl_2024_w11_bal_pit",
            "team_id": "nfl_PIT",
            "is_home": True,
            "total_yards": 303,
            "passing_yards": 181,
            "rushing_yards": 122,
            "turnovers": 1,
            "epa_total": 1.2,
            "epa_pass": 0.5,
            "epa_rush": 0.7,
            "third_down_comp": 4,
            "third_down_att": 16,
            "red_zone_comp": 0,
            "red_zone_att": 4,
            "time_of_possession": "36:22",
        },
    ]


def get_mock_key_plays() -> List[Dict[str, Any]]:
    """Returns defining plays with authentic Win Probability swings and EPA."""
    return [
        # Bills vs Chiefs: Josh Allen heroic 4th down scramble TD
        {
            "id": "play_w11_kc_buf_01",
            "game_id": "nfl_2024_w11_kc_buf",
            "play_id": "3820",
            "quarter": 4,
            "time_remaining": "02:17",
            "down": 4,
            "ydstogo": 2,
            "yardline": "KC 26",
            "possession_team_id": "nfl_BUF",
            "play_type": "run",
            "description": "J.Allen corre por el centro 26 yardas rompiendo tackleadas para TOUCHDOWN. Sella la victoria.",
            "epa": 4.65,
            "wp_before": 0.81,
            "wp_after": 0.99,
            "wp_swing": 0.18,
            "is_turnover": 0,
            "is_touchdown": 1,
            "highlight_timestamp": 580,
        },
        # Bills vs Chiefs: Patrick Mahomes intercepted by Bernard
        {
            "id": "play_w11_kc_buf_02",
            "game_id": "nfl_2024_w11_kc_buf",
            "play_id": "3940",
            "quarter": 4,
            "time_remaining": "01:07",
            "down": 4,
            "ydstogo": 13,
            "yardline": "KC 27",
            "possession_team_id": "nfl_KC",
            "play_type": "interception",
            "description": "P.Mahomes pase profundo al centro interceptado por T.Bernard en la yarda 45. Fin del invicto de KC.",
            "epa": -4.85,
            "wp_before": 0.05,
            "wp_after": 0.00,
            "wp_swing": 0.05,
            "is_turnover": 1,
            "is_touchdown": 0,
            "highlight_timestamp": 620,
        },
        # Packers vs Bears: Blocked Game-Winning Field Goal
        {
            "id": "play_w11_gb_chi_01",
            "game_id": "nfl_2024_w11_gb_chi",
            "play_id": "4010",
            "quarter": 4,
            "time_remaining": "00:03",
            "down": 4,
            "ydstogo": 6,
            "yardline": "GB 28",
            "possession_team_id": "nfl_CHI",
            "play_type": "field_goal",
            "description": "C.Santos intento de gol de campo de 46 yardas BLOQUEADO por K.Brooks en la última jugada.",
            "epa": -4.20,
            "wp_before": 0.76,
            "wp_after": 0.00,
            "wp_swing": 0.76,
            "is_turnover": 0,
            "is_touchdown": 0,
            "highlight_timestamp": 605,
        },
        # Ravens vs Steelers: Derrick Henry fumble
        {
            "id": "play_w11_bal_pit_01",
            "game_id": "nfl_2024_w11_bal_pit",
            "play_id": "120",
            "quarter": 1,
            "time_remaining": "13:22",
            "down": 2,
            "ydstogo": 8,
            "yardline": "BAL 38",
            "possession_team_id": "nfl_BAL",
            "play_type": "fumble",
            "description": "D.Henry acarreo por el centro forzado por P.Queen y recuperado por M.Fitzpatrick en la yarda 42.",
            "epa": -3.90,
            "wp_before": 0.58,
            "wp_after": 0.39,
            "wp_swing": 0.19,
            "is_turnover": 1,
            "is_touchdown": 0,
            "highlight_timestamp": 95,
        },
    ]


def get_mock_player_stats() -> List[Dict[str, Any]]:
    """Returns top individual weekly performers for awards calculation."""
    return [
        {
            "id": "stat_p_allen_w11",
            "player_name": "Josh Allen",
            "team_id": "nfl_BUF",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "position": "QB",
            "epa_total": 21.4,
            "epa_pass": 13.8,
            "epa_rush": 7.6,
            "epa_defense": 0.0,
            "pass_yards": 262,
            "pass_td": 1,
            "pass_int": 1,
            "rush_yards": 55,
            "rush_td": 1,
            "rec_yards": 0,
            "rec_td": 0,
            "tackles": 0,
            "sacks": 0.0,
            "interceptions": 0,
        },
        {
            "id": "stat_p_goff_w11",
            "player_name": "Jared Goff",
            "team_id": "nfl_DET",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "position": "QB",
            "epa_total": 19.8,
            "epa_pass": 19.8,
            "epa_rush": 0.0,
            "epa_defense": 0.0,
            "pass_yards": 412,
            "pass_td": 4,
            "pass_int": 0,
            "rush_yards": 0,
            "rush_td": 0,
            "rec_yards": 0,
            "rec_td": 0,
            "tackles": 0,
            "sacks": 0.0,
            "interceptions": 0,
        },
        {
            "id": "stat_p_watt_w11",
            "player_name": "T.J. Watt",
            "team_id": "nfl_PIT",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "position": "LB",
            "epa_total": 0.0,
            "epa_pass": 0.0,
            "epa_rush": 0.0,
            "epa_defense": -9.2,
            "pass_yards": 0,
            "pass_td": 0,
            "pass_int": 0,
            "rush_yards": 0,
            "rush_td": 0,
            "rec_yards": 0,
            "rec_td": 0,
            "tackles": 8,
            "sacks": 2.5,
            "interceptions": 1,
        },
    ]


def get_mock_trivia() -> List[Dict[str, Any]]:
    """Returns narrative bullets for YouTube script preparation."""
    return [
        {
            "id": "triv_w11_buf_01",
            "game_id": "nfl_2024_w11_kc_buf",
            "category": "streak",
            "fact_text": "Los Bills rompen la racha de 15 victorias consecutivas de Patrick Mahomes (incluyendo playoffs).",
        },
        {
            "id": "triv_w11_buf_02",
            "game_id": "nfl_2024_w11_kc_buf",
            "category": "record",
            "fact_text": "Josh Allen registra su cuarta victoria en temporada regular ante Kansas City, mayor cantidad en la era Mahomes.",
        },
        {
            "id": "triv_w11_gb_01",
            "game_id": "nfl_2024_w11_gb_chi",
            "category": "historical",
            "fact_text": "Green Bay extiende a 11 partidos consecutivos su dominio invicto sobre los Bears, la racha activa más larga de la rivalidad.",
        },
        {
            "id": "triv_w11_det_01",
            "game_id": "nfl_2024_w11_det_jax",
            "category": "milestone",
            "fact_text": "Los Lions anotan 52 puntos, la mayor cifra en la historia de la franquicia en un partido de temporada regular moderna.",
        },
    ]


def get_mock_awards() -> List[Dict[str, Any]]:
    """Returns preselected award nominees across all key categories."""
    return [
        # OPOW
        {
            "id": "mock_award_opow_1",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "OPOW",
            "candidate_name": "Josh Allen",
            "team_id": "nfl_BUF",
            "stat_summary": "262 yds pase, 55 yds carrera, 2 TD totales | +21.4 EPA",
            "metric_value": 21.4,
            "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+Week+11+Chiefs+run",
            "rank": 1,
        },
        {
            "id": "mock_award_opow_2",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "OPOW",
            "candidate_name": "Jared Goff",
            "team_id": "nfl_DET",
            "stat_summary": "412 yds pase, 4 TD, 0 INT, Passer Rating perfecto 158.3 | +19.8 EPA",
            "metric_value": 19.8,
            "clip_url": "https://www.youtube.com/results?search_query=Jared+Goff+Week+11+highlights",
            "rank": 2,
        },
        # DPOW
        {
            "id": "mock_award_dpow_1",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "DPOW",
            "candidate_name": "T.J. Watt",
            "team_id": "nfl_PIT",
            "stat_summary": "2.5 Sacks, 1 Intercepción, 8 Tackleadas vs Ravens",
            "metric_value": 28.5,
            "clip_url": "https://www.youtube.com/results?search_query=TJ+Watt+Week+11+vs+Ravens",
            "rank": 1,
        },
        # MVP
        {
            "id": "mock_award_mvp_1",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "MVP",
            "candidate_name": "Josh Allen",
            "team_id": "nfl_BUF",
            "stat_summary": "Mayor impacto global neto: +21.4 EPA ante el invicto bicampeón",
            "metric_value": 21.4,
            "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+MVP+case+Week+11",
            "rank": 1,
        },
        # Big Play: Special Teams
        {
            "id": "mock_award_st_1",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "SPECIAL_TEAMS",
            "candidate_name": "Karl Brooks (Packers) - Bloqueo de FG en última jugada",
            "team_id": "nfl_GB",
            "stat_summary": "Bloqueó intento de 46 yds con 0:03 restantes (WP Swing: +76.0%)",
            "metric_value": 76.0,
            "clip_url": "https://www.youtube.com/results?search_query=Packers+blocked+field+goal+Bears+Karl+Brooks",
            "rank": 1,
        },
        # DOs y DON'Ts
        {
            "id": "mock_award_do_1",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "DO",
            "candidate_name": "Acarreo de 26 yardas de Josh Allen en 4ta y 2",
            "team_id": "nfl_BUF",
            "stat_summary": "Jugada Maestra (+4.65 EPA) rompiendo dos tackleadas para sentenciar el juego",
            "metric_value": 4.65,
            "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+4th+down+touchdown+Chiefs",
            "rank": 1,
        },
        {
            "id": "mock_award_dont_1",
            "league": "nfl",
            "season": SEASON,
            "week": WEEK,
            "category": "DONT",
            "candidate_name": "Pase interceptado a Patrick Mahomes con 1:07 restante",
            "team_id": "nfl_KC",
            "stat_summary": "Error Garrafal (-4.85 EPA) forzando envío bajo presión en 4ta y 13",
            "metric_value": -4.85,
            "clip_url": "https://www.youtube.com/results?search_query=Patrick+Mahomes+interception+Terrel+Bernard",
            "rank": 1,
        },
    ]


def seed_mock_environment(custom_db_path: Optional[str | Path] = None) -> None:
    """Populates the database with the complete mock dataset in a single call."""
    db.init_db(custom_path=custom_db_path)
    # 1. Teams
    db.save_teams(assets_source.load_all_teams(), custom_path=custom_db_path)
    # 2. Games
    db.save_games(get_mock_games(), custom_path=custom_db_path)
    # 3. Team Stats
    db.save_game_team_stats(get_mock_game_team_stats(), custom_path=custom_db_path)
    # 4. Key Plays
    db.save_key_plays(get_mock_key_plays(), custom_path=custom_db_path)
    # 5. Player Stats
    db.save_player_weekly_stats(get_mock_player_stats(), custom_path=custom_db_path)
    # 6. Trivia
    db.save_game_trivia(get_mock_trivia(), custom_path=custom_db_path)
    # 7. Awards
    db.save_awards_candidates(get_mock_awards(), custom_path=custom_db_path)
