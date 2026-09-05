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


def get_mock_tactical_analyses() -> List[Dict[str, Any]]:
    """Returns broadcast-ready tactical analyses matching the requested Super Bowl LX structure."""
    return [
        {
            "id": "analysis_nfl_2024_w11_kc_buf",
            "game_id": "nfl_2024_w11_kc_buf",
            "headline": "Defensive Mastery and Tactical Supremacy: A Comprehensive Analysis of Chiefs @ Bills",
            "narrative_summary": "The narrative of Week 11's marquee matchup at Highmark Stadium was defined by Sean McDermott's aggressive fourth-down architecture and Buffalo's disguised two-high safety shells. In a decisive 30-21 victory over the Kansas City Chiefs, the Bills dismantled Kansas City's 15-game winning streak. While Josh Allen's 26-yard touchdown rumble on 4th-and-2 served as the cinematic exclamation point, it was Buffalo's interior defense that methodically choked Patrick Mahomes' passing options, holding the Chiefs to just 259 total yards and forcing two costly interceptions.",
            "historic_facts": [
                {
                    "title": "The Undefeated Fall",
                    "description": "Kansas City arrived 9-0; the loss snapped their 15-game winning streak (including playoffs) dating back to Christmas Day 2023."
                },
                {
                    "title": "Regular Season Supremacy",
                    "description": "Josh Allen improved to 4-1 all-time against Patrick Mahomes in regular season matchups, standing as the only quarterback in NFL history with a winning record against him (minimum 3 games)."
                },
                {
                    "title": "The Fourth-Down Crucible",
                    "description": "Leading 23-21 with 2:17 remaining, McDermott bypassed a 44-yard field goal on 4th-and-2, choosing to attack Spagnuolo's blitz rather than handing Mahomes a two-minute drill."
                },
                {
                    "title": "Turnover Inversion",
                    "description": "Buffalo completed the game without committing a single turnover while picking off Mahomes twice, generating 10 critical points off takeaways."
                },
                {
                    "title": "Explosive Play Neutralization",
                    "description": "Kansas City was held without a single pass play over 25 yards, forced into 19 completions under 8 air yards."
                }
            ],
            "award_deep_dives": [
                {
                    "role": "Defensive MVP",
                    "player": "The Buffalo Front Four (Collective)",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "Statistical Impact", "detail": "Generated 18 pressures, 3.0 sacks, 5 tackles for loss, and 8 QB hits solely with a four-man rush."},
                        {"label": "Interior Stunt Execution", "detail": "Buffalo hit the ball carrier behind the line on 42.8% of Kansas City's designed rushes."},
                        {"label": "Pressure Rate", "detail": "Generated a 44.1% pressure rate against Mahomes without blitzing a single defensive back."}
                    ]
                },
                {
                    "role": "Linebacker & Interception of the Game",
                    "player": "Terrel Bernard",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "The Game-Sealing Punctuation", "detail": "Understood Mahomes' cadence on 4th-and-13 with 1:07 left, sinking into the robber zone to snag the clinching interception mid-air."},
                        {"label": "Coverage Density", "detail": "Allowed only 1 completion for 6 yards on 4 targets in his coverage zone."},
                        {"label": "Tackle Leadership", "detail": "Led all linebackers on the field with 8 tackles (5 solo) and 1 tackle for loss."}
                    ]
                },
                {
                    "role": "Sack of the Week & Game on the Line Moment",
                    "player": "Greg Rousseau & Von Miller",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "Third-Quarter Strip Pressure", "detail": "Rousseau's speed rush on 3rd-and-9 forced Mahomes into a hurried sack-fumble recovered by Buffalo's offense."},
                        {"label": "Pass Rush Surge", "detail": "Miller and Rousseau recorded 9 total quarterback hurries across 26 passing downs."}
                    ]
                },
                {
                    "role": "Defensive Back of the Game",
                    "player": "Christian Benford",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "Target Mitigation", "detail": "Targeted 6 times, allowing only 2 receptions for 18 yards with 2 pass breakups against DeAndre Hopkins."},
                        {"label": "Touchdown Eraser", "detail": "Broke up a 3rd-and-goal fade in the second quarter, forcing Kansas City to settle for a field goal."}
                    ]
                },
                {
                    "role": "Defensive Lineman of the Game",
                    "player": "Ed Oliver",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "Pocket Collapse", "detail": "Penetrated the A-gap on 40% of passing plays, forcing Mahomes to scramble backward into containment."},
                        {"label": "Key TFL", "detail": "Stuffed Kareem Hunt on 2nd-and-1 in the fourth quarter, stalling Kansas City's penultimate drive."}
                    ]
                },
                {
                    "role": "Special Teams of the Week",
                    "player": "Tyler Bass",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "Wind Mastery", "detail": "Converted 3 extra points and a 33-yard field goal amidst 14 mph crosswinds at Highmark Stadium."},
                        {"label": "Field Position Control", "detail": "Delivered 5 touchbacks on 6 kickoffs, denying Xavier Worthy any return momentum."}
                    ]
                },
                {
                    "role": "The Engine (Official Game MVP)",
                    "player": "Josh Allen",
                    "team_code": "BUF",
                    "bullets": [
                        {"label": "Volume & Efficiency", "detail": "262 passing yards, 55 rushing yards, 2 total touchdowns, and +14.8 total EPA."},
                        {"label": "The 26-Yard Dagger", "detail": "On 4th-and-2 with 2:17 left, broke tackles by Chamarri Conner and Bryan Cook to barrel into the end zone."},
                        {"label": "Fourth-Quarter Conditioning", "detail": "Completed 6-of-7 passes for 74 yards and added 32 rushing yards in the final quarter alone."}
                    ]
                }
            ],
            "tactical_dos_donts": [
                {
                    "type": "DO",
                    "strategy": "Deploy Two-High Shells with Robber Disguise",
                    "logic": "Buffalo played Cover-4 and Cover-6 on 71% of snaps, eliminating vertical routes and forcing short checkdowns."
                },
                {
                    "type": "DO",
                    "strategy": "Maintain 4th-and-Short Aggressiveness vs Heavy Blitz",
                    "logic": "Going for it on 4th-and-2 avoided giving Mahomes the football with two minutes and a single-possession deficit."
                },
                {
                    "type": "DONT",
                    "strategy": "Empty the Second Level with Cover-0 Blitzes vs Allen",
                    "logic": "Spagnuolo's all-out blitz cleared the middle of the field, giving Allen an open lane to scamper 26 yards for the touchdown."
                },
                {
                    "type": "DONT",
                    "strategy": "Force Boundary Passes Under Interior Duress",
                    "logic": "Mahomes' panic throw on 4th-and-13 into Bernard's robber coverage resulted in the game-ending interception."
                }
            ]
        },
        {
            "id": "analysis_nfl_2024_w11_bal_pit",
            "game_id": "nfl_2024_w11_bal_pit",
            "headline": "Trench Attrition & Red Zone Denial: Pittsburgh Smothers the League's #1 Offense",
            "narrative_summary": "In the NFL's premier defensive bloodbath, Mike Tomlin's Steelers delivered a tactical masterclass, toppling the Baltimore Ravens 18-16 at Acrisure Stadium. Despite scoring zero offensive touchdowns, Pittsburgh relied on Chris Boswell's leg and an impregnable front seven that contained Derrick Henry to just 65 yards and forced three crucial Baltimore turnovers.",
            "historic_facts": [
                {
                    "title": "Tomlin's Lamar Hex",
                    "description": "Mike Tomlin improved to 8-1 all-time against Lamar Jackson, holding the two-time MVP to his lowest passer rating of the 2024 season (66.1)."
                },
                {
                    "title": "Touchdown-less Victory",
                    "description": "Pittsburgh became only the second team in 2024 to win a game without scoring an offensive touchdown, fueled by 6 Chris Boswell field goals."
                },
                {
                    "title": "Two-Point Conversion Stand",
                    "description": "Holding a 18-16 lead with 1:06 left, Pittsburgh stuffed Lamar Jackson on a designed quarterback sprint-out to preserve the win."
                }
            ],
            "award_deep_dives": [
                {
                    "role": "Defensive MVP",
                    "player": "T.J. Watt & Nick Herbig (Edge Tandem)",
                    "team_code": "PIT",
                    "bullets": [
                        {"label": "Game-Changing Disruption", "detail": "Herbig punched the ball free from Derrick Henry on Baltimore's opening drive, setting an immediate tone."},
                        {"label": "Pressure Rate", "detail": "Watt generated 7 quarterback hurries, commanding double teams on 68% of dropbacks."}
                    ]
                },
                {
                    "role": "Linebacker & Forced Fumble of the Game",
                    "player": "Patrick Queen (Revenge Game)",
                    "team_code": "PIT",
                    "bullets": [
                        {"label": "Stripping Likely", "detail": "Stripped former teammate Isaiah Likely right before halftime and recovered the fumble to set up a Boswell field goal."},
                        {"label": "Tackle Leadership", "detail": "Finished with 10 total tackles and 1 tackle for loss in his first game against Baltimore."}
                    ]
                },
                {
                    "role": "Defensive Back of the Game",
                    "player": "Joey Porter Jr. & Minkah Fitzpatrick",
                    "team_code": "PIT",
                    "bullets": [
                        {"label": "Zay Flowers Lock", "detail": "Porter held Flowers to 2 catches for 19 yards in man-to-man coverage."},
                        {"label": "Late Interception", "detail": "Fitzpatrick disrupted a deep 3rd-down seam route in the fourth quarter."}
                    ]
                },
                {
                    "role": "Special Teams of the Week",
                    "player": "Chris Boswell",
                    "team_code": "PIT",
                    "bullets": [
                        {"label": "Six-Field Goal Siege", "detail": "Converted field goals of 32, 52, 32, 57, 27, and 50 yards in freezing conditions."},
                        {"label": "Franchise Record", "detail": "Became the first kicker in Steelers franchise history with three 50+ yard field goals in a single game."}
                    ]
                },
                {
                    "role": "The Engine (Official Game MVP)",
                    "player": "Chris Boswell (Special Teams) / Russell Wilson",
                    "team_code": "PIT",
                    "bullets": [
                        {"label": "Field Position Control", "detail": "Scored all 18 of Pittsburgh's points, outscoring Baltimore's entire offense by himself."}
                    ]
                }
            ],
            "tactical_dos_donts": [
                {
                    "type": "DO",
                    "strategy": "Set Hard Edge Boundaries Against Derrick Henry",
                    "logic": "Pittsburgh kept both outside linebackers on the contain line, holding Henry under 70 yards for the first time in 9 weeks."
                },
                {
                    "type": "DO",
                    "strategy": "Blitz the A-Gap on Obvious Passing Downs",
                    "logic": "Tomlin delayed interior linebackers through the A-gap, disrupting Lamar Jackson's throwing window and forcing inaccurate checkdowns."
                },
                {
                    "type": "DONT",
                    "strategy": "Bite on Play-Action Fakes without Deep Safety Help",
                    "logic": "Over-committing to run defense allowed Isaiah Likely a 42-yard seam reception in the second half."
                },
                {
                    "type": "DONT",
                    "strategy": "Commit Pre-Snap Penalties in Enemy Territory",
                    "logic": "Baltimore committed 12 penalties for 80 yards, repeatedly pushing them out of field goal range."
                }
            ]
        },
        {
            "id": "analysis_nfl_2024_w11_gb_chi",
            "game_id": "nfl_2024_w11_gb_chi",
            "headline": "Special Teams Miracle & Trench Penetration: Karl Brooks' Block Stuns Soldier Field",
            "narrative_summary": "In the 209th chapter of the NFL's oldest rivalry, the Green Bay Packers escaped Soldier Field with a 20-19 victory after defensive lineman Karl Brooks penetrated the Bears' field goal protection unit to block Cairo Santos' 46-yard attempt with zeros on the clock. While rookie Caleb Williams orchestrated an impressive 4th-quarter comeback drive, Chicago's premature decision to settle for a long kick on first down proved fatal.",
            "historic_facts": [
                {
                    "title": "Historic Rivalry Streak",
                    "description": "Green Bay extended their win streak over Chicago to 11 consecutive games, the longest streak in the history of the 103-year rivalry."
                },
                {
                    "title": "The Final Second Block",
                    "description": "It marked Green Bay's first blocked game-winning field goal attempt at 0:00 since 1999."
                },
                {
                    "title": "Caleb Williams Growth",
                    "description": "Williams converted two separate 3rd-and-longs on the final drive, passing for 231 yards with zero turnovers under new OC Thomas Brown."
                }
            ],
            "award_deep_dives": [
                {
                    "role": "Defensive MVP & Game on the Line Moment",
                    "player": "Karl Brooks & Field Goal Block Unit",
                    "team_code": "GB",
                    "bullets": [
                        {"label": "Fingertip Miracle", "detail": "Brooks timed the snap perfectly, slicing between Bears interior linemen Scott and Jenkins to get a glove on the ball."},
                        {"label": "Trench Penetration", "detail": "The Packers' block unit generated a 2-yard push into the Bears' backfield."}
                    ]
                },
                {
                    "role": "Linebacker of the Game",
                    "player": "Quay Walker",
                    "team_code": "GB",
                    "bullets": [
                        {"label": "Tackle Engine", "detail": "Recorded 9 tackles and 1 sack, tracking down Caleb Williams on two designed scrambles."}
                    ]
                },
                {
                    "role": "The Engine (Game MVP)",
                    "player": "Christian Watson",
                    "team_code": "GB",
                    "bullets": [
                        {"label": "Explosive Playmaker", "detail": "Caught 4 passes for 150 yards, including a 60-yard diving bomb that set up the Packers' go-ahead score."}
                    ]
                }
            ],
            "tactical_dos_donts": [
                {
                    "type": "DO",
                    "strategy": "Overload the Interior A-Gap on Field Goal Protection",
                    "logic": "Rich Bisaccia's special teams scheme exploited low trajectory angles from Santos' middle range."
                },
                {
                    "type": "DONT",
                    "strategy": "Settle for a 46-Yard Field Goal on 1st Down with 30 Seconds Left",
                    "logic": "Chicago had 30 seconds and a timeout, but elected to run down the clock instead of gaining an extra 5-10 yards for a safer kick."
                }
            ]
        },
        {
            "id": "analysis_nfl_2024_w11_det_jax",
            "game_id": "nfl_2024_w11_det_jax",
            "headline": "Offensive Juggernaut & Defensive Suffocation: Detroit's Historic 46-Point Demolition",
            "narrative_summary": "The Detroit Lions established themselves as the NFC's undisputed titan in a 52-6 rout of the Jacksonville Jaguars at Ford Field. Ben Johnson's offense scored touchdowns on their first seven consecutive possessions while Aaron Glenn's defense suffocated Mac Jones, allowing only 170 total yards and generating a +46 point differential, the largest in modern franchise history.",
            "historic_facts": [
                {
                    "title": "Franchise Margin of Victory",
                    "description": "Detroit's 46-point victory was the largest margin of victory in the 94-year history of the Lions franchise."
                },
                {
                    "title": "Total Yardage Supremacy",
                    "description": "Detroit outgained Jacksonville 645 to 170 (+475 yard differential), scoring touchdowns on 7 straight drives."
                },
                {
                    "title": "Goff's Perfect Game",
                    "description": "Jared Goff achieved a perfect 158.3 passer rating, completing 24 of 29 passes for 412 yards and 4 touchdowns."
                }
            ],
            "award_deep_dives": [
                {
                    "role": "Defensive MVP",
                    "player": "Aaron Glenn's Defensive Unit",
                    "team_code": "DET",
                    "bullets": [
                        {"label": "Total Containment", "detail": "Held Jacksonville to 170 total yards and 1 of 10 on third down conversions."},
                        {"label": "Pass Rush Surge", "detail": "Generated 4.0 sacks on Mac Jones, led by newly acquired Za'Darius Smith."}
                    ]
                },
                {
                    "role": "The Engine (Official Game MVP)",
                    "player": "Jared Goff & Amon-Ra St. Brown",
                    "team_code": "DET",
                    "bullets": [
                        {"label": "Historic Perfection", "detail": "Goff finished with 412 passing yards, 4 touchdowns, and a 158.3 maximum passer rating."},
                        {"label": "St. Brown Dominance", "detail": "Amon-Ra recorded 11 receptions for 161 yards and 2 touchdowns."}
                    ]
                }
            ],
            "tactical_dos_donts": [
                {
                    "type": "DO",
                    "strategy": "Utilize Heavy Play-Action Motion Against Soft Cover-3",
                    "logic": "Detroit's play-action pulled Jacksonville linebackers toward Montgomery and Gibbs, opening 25-yard seams."
                },
                {
                    "type": "DONT",
                    "strategy": "Abandon Gap Integrity Against Duo Blocking Schemes",
                    "logic": "Jacksonville over-pursued on outside zone, allowing Detroit running backs cutback lanes for 196 rushing yards."
                }
            ]
        },
        {
            "id": "analysis_ncaa_2024_w11_uga_ala",
            "game_id": "ncaa_2024_w11_uga_ala",
            "headline": "SEC Instant Classic: Ryan Williams' 75-Yard Miracle Outlasts Georgia's Epic Rally",
            "narrative_summary": "In an unforgettable clash of college football titans at Bryant-Denny Stadium, Alabama held off Georgia 41-34. After surging to an astonishing 28-0 lead in the first half, Alabama surrendered the lead 34-33 late in the fourth quarter. But 17-year-old freshman phenom Ryan Williams executed a spellbinding catch, double-spin move, and 75-yard touchdown dash with 2:18 left, before safety Zabien Brown intercepted Carson Beck in the end zone to ice the victory.",
            "historic_facts": [
                {
                    "title": "28-Point Overcome Almost Historic",
                    "description": "Georgia nearly completed the largest comeback in SEC history, overcoming a 28-point deficit before Williams' late miracle."
                },
                {
                    "title": "Carson Beck Turnovers",
                    "description": "Alabama's defense forced 4 turnovers from Carson Beck (3 interceptions, 1 fumble), converting them into 21 points."
                },
                {
                    "title": "Milroe's Dual-Threat Dominance",
                    "description": "Jalen Milroe generated 491 total yards (374 passing, 117 rushing) and 4 total touchdowns."
                }
            ],
            "award_deep_dives": [
                {
                    "role": "Defensive MVP & Game on the Line Moment",
                    "player": "Zabien Brown & Malachi Moore",
                    "team_code": "ALA",
                    "bullets": [
                        {"label": "Endzone Interception", "detail": "Brown intercepted Beck in the endzone with 43 seconds left on 1st-and-10 from the Alabama 20."},
                        {"label": "Four Takeaways", "detail": "Kane Wommack's Swarm D recorded 3 interceptions and a forced fumble."}
                    ]
                },
                {
                    "role": "The Engine (Game MVP)",
                    "player": "Ryan Williams & Jalen Milroe",
                    "team_code": "ALA",
                    "bullets": [
                        {"label": "The 75-Yard Spin-Cycle", "detail": "Williams caught an over-the-shoulder ball, spun 360 degrees past Julian Humphrey, and raced into the end zone."},
                        {"label": "Total Yardage", "detail": "Williams finished with 6 catches for 177 yards and the game-winning touchdown."}
                    ]
                }
            ],
            "tactical_dos_donts": [
                {
                    "type": "DO",
                    "strategy": "Utilize Designed QB Draws to Punish Two-Deep Safeties",
                    "logic": "Milroe gashed Kirby Smart's defense for 117 rushing yards whenever Georgia dropped both safeties deep."
                },
                {
                    "type": "DONT",
                    "strategy": "Force Contested Boundary Jump Balls on First Down",
                    "logic": "Beck's game-ending interception occurred when trying to force a fade into double coverage with 43 seconds and 2 timeouts remaining."
                }
            ]
        }
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
    # 8. Tactical Deep Research Analyses
    db.save_game_tactical_analysis(get_mock_tactical_analyses(), custom_path=custom_db_path)

