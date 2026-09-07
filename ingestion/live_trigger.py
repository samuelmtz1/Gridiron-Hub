"""Live Trigger and Scoreboard Monitor for Gridiron Hub.

Monitors game status using ESPN's public scoreboard endpoint (site.api.espn.com).
Acts as an event trigger for when games reach 'STATUS_FINAL' to initiate post-game ingestion.
Cost: $0 perpetual (Public, no API key required).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import urllib.request
import json
import re

logger = logging.getLogger(__name__)

ESPN_SCOREBOARD_URLS = {
    "nfl": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    "ncaa": "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
}

ESPN_SUMMARY_URLS = {
    "nfl": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary",
    "ncaa": "https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary",
}

NCAA_CONFERENCES = {
    "1": "ACC",
    "4": "Big 12",
    "5": "Big Ten",
    "8": "SEC",
    "9": "Pac-12",
    "12": "Conference USA",
    "15": "MAC",
    "17": "Mountain West",
    "18": "FBS Independents",
    "37": "Sun Belt",
    "151": "American",
}


def fetch_espn_scoreboard(
    league: str = "nfl",
    season: Optional[int] = None,
    week: Optional[int] = None
) -> Dict[str, Any]:
    """Fetches scoreboard JSON from ESPN public endpoint with support for season & week filtering."""
    base_url = ESPN_SCOREBOARD_URLS.get(league.lower(), ESPN_SCOREBOARD_URLS["nfl"])
    params = ["limit=100"]
    if league.lower() == "ncaa":
        params.append("groups=80")

    if season is not None and week is not None:
        params.append(f"dates={season}")
        params.append(f"week={week}")
        params.append("seasontype=2")

    url = f"{base_url}?{'&'.join(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data
    except Exception as exc:
        logger.warning(f"Error al consultar ESPN Scoreboard ({league}, {season} w{week}): {exc}")
    return {}


def extract_teams_from_scoreboard(scoreboard_data: Dict[str, Any], league: str = "nfl") -> List[Dict[str, Any]]:
    """Extracts official team assets (logo, colors, name, conference) from ESPN scoreboard payload."""
    teams_map: Dict[str, Dict[str, Any]] = {}
    events = scoreboard_data.get("events", [])

    for event in events:
        competitions = event.get("competitions", [])
        if not competitions:
            continue
        competition = competitions[0]
        for comp in competition.get("competitors", []):
            team_info = comp.get("team", {})
            abbr = (team_info.get("abbreviation") or "").upper().replace("&", "")
            if not abbr:
                continue

            team_id = f"{league}_{abbr}"
            if team_id not in teams_map:
                color = team_info.get("color") or "002244"
                alt_color = team_info.get("alternateColor") or "FFFFFF"
                espn_id = team_info.get("id")
                logo = team_info.get("logo") or f"https://a.espncdn.com/i/teamlogos/{league}/500/{espn_id or abbr.lower()}.png"

                # Detect conference
                conf_id = str(team_info.get("conferenceId") or "")
                if league == "ncaa":
                    conference = NCAA_CONFERENCES.get(conf_id, "NCAA")
                else:
                    conference = "AFC" if "AFC" in abbr else "NFC"

                teams_map[team_id] = {
                    "id": team_id,
                    "league": league,
                    "code": abbr,
                    "name": team_info.get("displayName") or team_info.get("name") or abbr,
                    "short_name": team_info.get("shortDisplayName") or abbr,
                    "city": team_info.get("location") or "",
                    "conference": conference,
                    "division": None,
                    "primary_color": f"#{color.lstrip('#')}",
                    "secondary_color": f"#{alt_color.lstrip('#')}",
                    "logo_url": logo,
                }

    return list(teams_map.values())


def parse_scoreboard_events(scoreboard_data: Dict[str, Any], league: str = "nfl") -> List[Dict[str, Any]]:
    """Parses raw ESPN scoreboard payload into normalized Gridiron Hub game dictionaries."""
    parsed_games: List[Dict[str, Any]] = []
    events = scoreboard_data.get("events", [])

    for event in events:
        try:
            event_id = str(event.get("id") or "")
            competitions = event.get("competitions", [])
            if not competitions:
                continue
            competition = competitions[0]
            competitors = competition.get("competitors", [])

            home_comp = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away_comp = next((c for c in competitors if c.get("homeAway") == "away"), {})

            home_team = home_comp.get("team", {})
            away_team = away_comp.get("team", {})

            status_type = competition.get("status", {}).get("type", {})
            status_name = status_type.get("name", "STATUS_SCHEDULED")
            is_completed = status_type.get("completed", False)

            status_normalized = "final" if is_completed else ("in_progress" if status_name == "STATUS_IN_PROGRESS" else "scheduled")

            venue_data = competition.get("venue", {})
            venue_name = venue_data.get("fullName", "Estadio no especificado")

            # Weather if available
            weather_data = competition.get("weather", {})
            weather_temp = weather_data.get("temperature")
            weather_desc = weather_data.get("displayValue")

            # Season & week info
            season_info = scoreboard_data.get("season", {})
            season_year = int(season_info.get("year", 2026))
            week_info = scoreboard_data.get("week", {})
            week_number = int(week_info.get("number", 1))

            home_code = (home_team.get("abbreviation") or "UNK").upper().replace("&", "")
            away_code = (away_team.get("abbreviation") or "UNK").upper().replace("&", "")
            game_id = f"{league}_{season_year}_w{week_number}_{away_code.lower()}_{home_code.lower()}"

            home_raw_score = home_comp.get("score")
            away_raw_score = away_comp.get("score")
            home_score = int(home_raw_score) if home_raw_score not in [None, ""] else 0
            away_score = int(away_raw_score) if away_raw_score not in [None, ""] else 0

            home_conf_id = str(home_team.get("conferenceId") or "")
            away_conf_id = str(away_team.get("conferenceId") or "")
            home_conf = NCAA_CONFERENCES.get(home_conf_id, "NCAA") if league == "ncaa" else ("AFC" if "AFC" in home_code else "NFC")
            away_conf = NCAA_CONFERENCES.get(away_conf_id, "NCAA") if league == "ncaa" else ("AFC" if "AFC" in away_code else "NFC")

            parsed_games.append({
                "id": game_id,
                "event_id": event_id,
                "league": league,
                "season": season_year,
                "season_type": "regular",
                "week": week_number,
                "game_date": event.get("date", ""),
                "home_team_id": f"{league}_{home_code}",
                "away_team_id": f"{league}_{away_code}",
                "home_score": home_score,
                "away_score": away_score,
                "status": status_normalized,
                "venue": venue_name,
                "weather_temp": weather_temp,
                "weather_desc": weather_desc,
                "highlight_url": f"https://www.youtube.com/results?search_query={away_code}+vs+{home_code}+highlights+{season_year}",
                "home_conference": home_conf,
                "away_conference": away_conf,
            })
        except Exception as e:
            logger.debug(f"Error parsing event: {e}")
            continue

    return parsed_games


def fetch_espn_game_summary(event_id: str, league: str = "nfl", app_game_id: str = "") -> Dict[str, Any]:
    """Fetches real boxscore and scoring plays from ESPN summary endpoint."""
    base_url = ESPN_SUMMARY_URLS.get(league.lower(), ESPN_SUMMARY_URLS["nfl"])
    url = f"{base_url}?event={event_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    team_stats: List[Dict[str, Any]] = []
    key_plays: List[Dict[str, Any]] = []

    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status != 200:
                return {"team_stats": [], "key_plays": []}
            data = json.loads(response.read().decode("utf-8"))

            gid = app_game_id or f"{league}_{event_id}"
            teams_to_register: List[Dict[str, Any]] = []

            # 1. Pre-scan scoring plays to associate scoring stats per team
            scoring_plays = data.get("scoringPlays", [])
            team_td_pass: Dict[str, int] = {}
            team_td_rush: Dict[str, int] = {}
            team_fg_made: Dict[str, int] = {}
            team_rz_comp: Dict[str, int] = {}

            for sp in scoring_plays:
                sp_team = sp.get("team", {})
                sp_code = (sp_team.get("abbreviation") or "").upper().replace("&", "")
                text_u = (sp.get("text") or "").upper()
                st_disp = (sp.get("scoringType", {}).get("displayName") or "").upper()

                is_td = "TOUCHDOWN" in st_disp or "TOUCHDOWN" in text_u or " TD" in text_u
                is_pass = "PASS" in text_u or "PASS" in st_disp
                is_rush = "RUN" in text_u or "RUSH" in text_u or "RUSH" in st_disp
                is_fg = "FIELD GOAL" in st_disp or "FIELD GOAL" in text_u or " FG" in text_u

                # Check yardage for redzone (inside 20)
                m_yd = re.search(r'(\d+)\s*YD', text_u)
                yds_val = int(m_yd.group(1)) if m_yd else 0
                if (is_td and yds_val > 0 and yds_val <= 20) or is_fg:
                    team_rz_comp[sp_code] = team_rz_comp.get(sp_code, 0) + 1

                if is_td:
                    if is_pass:
                        team_td_pass[sp_code] = team_td_pass.get(sp_code, 0) + 1
                    elif is_rush:
                        team_td_rush[sp_code] = team_td_rush.get(sp_code, 0) + 1
                elif is_fg:
                    team_fg_made[sp_code] = team_fg_made.get(sp_code, 0) + 1

            # 2. Parse boxscore teams
            boxscore_teams = data.get("boxscore", {}).get("teams", [])
            for t in boxscore_teams:
                t_info = t.get("team", {})
                t_code = (t_info.get("abbreviation") or "UNK").upper().replace("&", "")
                if not t_code or t_code == "UNK":
                    continue

                team_id = f"{league}_{t_code}"
                color = t_info.get("color") or "002244"
                alt_color = t_info.get("alternateColor") or "FFFFFF"
                espn_id = t_info.get("id")
                logo = t_info.get("logo") or f"https://a.espncdn.com/i/teamlogos/{league}/500/{espn_id or t_code.lower()}.png"

                teams_to_register.append({
                    "id": team_id,
                    "league": league,
                    "code": t_code,
                    "name": t_info.get("displayName") or t_info.get("name") or t_code,
                    "short_name": t_info.get("shortDisplayName") or t_code,
                    "city": t_info.get("location") or "",
                    "conference": NCAA_CONFERENCES.get(str(t_info.get("conferenceId") or ""), "NCAA") if league == "ncaa" else ("AFC" if "AFC" in t_code else "NFC"),
                    "division": None,
                    "primary_color": f"#{color.lstrip('#')}",
                    "secondary_color": f"#{alt_color.lstrip('#')}",
                    "logo_url": logo,
                })

                stats_list = t.get("statistics", [])
                s_map = {s.get("name"): s.get("displayValue") for s in stats_list}

                # Third down
                third_eff = s_map.get("thirdDownEff", "0-0")
                t_comp, t_att = 0, 0
                if "-" in third_eff:
                    parts = third_eff.split("-")
                    try:
                        t_comp = int(parts[0])
                        t_att = int(parts[1])
                    except (ValueError, IndexError):
                        pass

                tot_y = int(s_map.get("totalYards", 0)) if str(s_map.get("totalYards", 0)).isdigit() else 0
                pass_y = int(s_map.get("netPassingYards", 0)) if str(s_map.get("netPassingYards", 0)).isdigit() else 0
                rush_y = int(s_map.get("rushingYards", 0)) if str(s_map.get("rushingYards", 0)).isdigit() else 0
                turnovers = int(s_map.get("turnovers", 0)) if str(s_map.get("turnovers", 0)).isdigit() else 0
                fumbles_lost = int(s_map.get("fumblesLost", 0)) if str(s_map.get("fumblesLost", 0)).isdigit() else 0
                interceptions = int(s_map.get("interceptions", 0)) if str(s_map.get("interceptions", 0)).isdigit() else 0
                top_str = str(s_map.get("possessionTime", "30:00"))

                # Attempts for EPA
                comp_att = str(s_map.get("completionAttempts", "0/0"))
                pass_att = int(comp_att.split("/")[-1]) if "/" in comp_att and comp_att.split("/")[-1].isdigit() else (pass_y // 8 if pass_y else 20)
                rush_att = int(s_map.get("rushingAttempts", 0)) if str(s_map.get("rushingAttempts", 0)).isdigit() else (rush_y // 4 if rush_y else 25)

                td_pass = team_td_pass.get(t_code, 0)
                td_rush = team_td_rush.get(t_code, 0)

                # EPA calculation
                epa_pass = round((pass_y * 0.048) + (td_pass * 2.1) - (interceptions * 4.2) - (pass_att * 0.11), 1)
                epa_rush = round((rush_y * 0.038) + (td_rush * 1.8) - (fumbles_lost * 3.8) - (rush_att * 0.08), 1)
                epa_total = round(epa_pass + epa_rush + (t_comp * 0.75) - (turnovers * 4.0), 1)

                rz_comp = team_rz_comp.get(t_code, 0)
                rz_att = max(rz_comp, td_pass + td_rush + team_fg_made.get(t_code, 0))

                team_stats.append({
                    "id": f"stat_{gid}_{t_code.lower()}",
                    "game_id": gid,
                    "team_id": team_id,
                    "is_home": t.get("homeAway") == "home",
                    "total_yards": tot_y,
                    "passing_yards": pass_y,
                    "rushing_yards": rush_y,
                    "turnovers": turnovers,
                    "epa_total": epa_total,
                    "epa_pass": epa_pass,
                    "epa_rush": epa_rush,
                    "third_down_comp": t_comp,
                    "third_down_att": t_att,
                    "red_zone_comp": rz_comp,
                    "red_zone_att": max(rz_att, 1) if rz_comp > 0 else 0,
                    "time_of_possession": top_str,
                })

            # 3. Parse scoring plays as key plays (up to 8 plays)
            reg_team_ids = {tm["id"] for tm in teams_to_register}
            fallback_team_id = team_stats[0]["team_id"] if team_stats else f"{league}_UNK"

            for idx, sp in enumerate(scoring_plays[:8]):
                clock = sp.get("clock", {})
                time_rem = clock.get("displayValue", "00:00") if isinstance(clock, dict) else str(clock)
                period = sp.get("period", {})
                qtr = period.get("number", 1) if isinstance(period, dict) else int(period or 1)
                desc = sp.get("text", "")

                sp_team = sp.get("team", {})
                sp_code = (sp_team.get("abbreviation") or "").upper().replace("&", "")
                candidate_poss_id = f"{league}_{sp_code}" if sp_code else fallback_team_id
                poss_team_id = candidate_poss_id if candidate_poss_id in reg_team_ids else fallback_team_id

                st_disp = (sp.get("scoringType", {}).get("displayName") or "").upper()
                st_name = (sp.get("scoringType", {}).get("name") or "").upper()
                is_td = 1 if ("TD" in desc.upper() or "TOUCHDOWN" in desc.upper() or "TOUCHDOWN" in st_disp or "TOUCHDOWN" in st_name or "KICK)" in desc.upper() or "TWO-POINT" in desc.upper()) else 0
                # WP swing estimation based on quarter and score impact
                base_swing = 0.14 if is_td else 0.07
                if qtr >= 4:
                    base_swing += 0.16
                elif qtr == 3:
                    base_swing += 0.08
                wp_swing = min(round(base_swing + (0.02 * (idx % 3)), 2), 0.65)
                play_epa = round(3.8 if is_td else 1.8, 1)

                key_plays.append({
                    "id": f"play_{gid}_{idx}",
                    "game_id": gid,
                    "play_id": f"p_{idx}",
                    "quarter": qtr,
                    "time_remaining": time_rem,
                    "down": 1,
                    "ydstogo": 10,
                    "yardline": "EZ",
                    "possession_team_id": poss_team_id,
                    "play_type": "score",
                    "description": desc,
                    "epa": play_epa,
                    "wp_before": 0.50,
                    "wp_after": round(0.50 + (wp_swing if poss_team_id == fallback_team_id else -wp_swing), 2),
                    "wp_swing": wp_swing,
                    "is_turnover": 0,
                    "is_touchdown": is_td,
                    "highlight_timestamp": None,
                })

    except Exception as exc:
        logger.warning(f"Error al consultar ESPN Summary ({event_id}): {exc}")

    return {"teams": teams_to_register, "team_stats": team_stats, "key_plays": key_plays}


def check_finished_games(league: str = "nfl") -> List[Dict[str, Any]]:
    """Fetches scoreboard and returns only games that have finished (STATUS_FINAL)."""
    data = fetch_espn_scoreboard(league)
    all_games = parse_scoreboard_events(data, league)
    return [g for g in all_games if g["status"] == "final"]
