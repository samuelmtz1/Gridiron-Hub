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
    "12": "MAC",
    "17": "Mountain West",
    "18": "FBS Independents",
    "37": "Sun Belt",
    "99": "Conference USA",
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

            # 1. Parse boxscore teams
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
                    "conference": "NCAA" if league == "ncaa" else ("AFC" if "AFC" in t_code else "NFC"),
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
                top_str = str(s_map.get("possessionTime", "30:00"))

                team_stats.append({
                    "id": f"stat_{gid}_{t_code.lower()}",
                    "game_id": gid,
                    "team_id": team_id,
                    "is_home": t.get("homeAway") == "home",
                    "total_yards": tot_y,
                    "passing_yards": pass_y,
                    "rushing_yards": rush_y,
                    "turnovers": turnovers,
                    "epa_total": 0.0,
                    "epa_pass": 0.0,
                    "epa_rush": 0.0,
                    "third_down_comp": t_comp,
                    "third_down_att": t_att,
                    "red_zone_comp": 0,
                    "red_zone_att": 0,
                    "time_of_possession": top_str,
                })

            # 2. Parse scoring plays as key plays
            reg_team_ids = {tm["id"] for tm in teams_to_register}
            fallback_team_id = team_stats[0]["team_id"] if team_stats else f"{league}_UNK"

            scoring_plays = data.get("scoringPlays", [])
            for idx, sp in enumerate(scoring_plays[:5]):
                clock = sp.get("clock", {})
                time_rem = clock.get("displayValue", "00:00") if isinstance(clock, dict) else str(clock)
                period = sp.get("period", {})
                qtr = period.get("number", 1) if isinstance(period, dict) else int(period or 1)
                desc = sp.get("text", "")

                sp_team = sp.get("team", {})
                sp_code = (sp_team.get("abbreviation") or "").upper().replace("&", "")
                candidate_poss_id = f"{league}_{sp_code}" if sp_code else fallback_team_id
                poss_team_id = candidate_poss_id if candidate_poss_id in reg_team_ids else fallback_team_id

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
                    "epa": 2.5,
                    "wp_before": 0.50,
                    "wp_after": 0.65,
                    "wp_swing": 0.15,
                    "is_turnover": 0,
                    "is_touchdown": 1 if "TD" in desc.upper() or "TOUCHDOWN" in desc.upper() else 0,
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
