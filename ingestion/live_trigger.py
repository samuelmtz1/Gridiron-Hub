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


def fetch_espn_scoreboard(league: str = "nfl") -> Dict[str, Any]:
    """Fetches current scoreboard JSON from ESPN public endpoint."""
    url = ESPN_SCOREBOARD_URLS.get(league.lower(), ESPN_SCOREBOARD_URLS["nfl"])
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GridironHub/1.0 (YouTube Research Automation)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data
    except Exception as exc:
        logger.warning(f"Error al consultar ESPN Scoreboard ({league}): {exc}")
    return {}


def parse_scoreboard_events(scoreboard_data: Dict[str, Any], league: str = "nfl") -> List[Dict[str, Any]]:
    """Parses raw ESPN scoreboard payload into normalized Gridiron Hub game dictionaries."""
    parsed_games: List[Dict[str, Any]] = []
    events = scoreboard_data.get("events", [])

    for event in events:
        try:
            competition = event.get("competitions", [{}])[0]
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
            season_year = season_info.get("year", 2024)
            week_info = scoreboard_data.get("week", {})
            week_number = week_info.get("number", 1)

            home_code = home_team.get("abbreviation", "UNK")
            away_code = away_team.get("abbreviation", "UNK")
            game_id = f"{league}_{season_year}_w{week_number}_{away_code.lower()}_{home_code.lower()}"

            parsed_games.append({
                "id": game_id,
                "league": league,
                "season": season_year,
                "season_type": "regular",
                "week": week_number,
                "game_date": event.get("date", ""),
                "home_team_id": f"{league}_{home_code.upper()}",
                "away_team_id": f"{league}_{away_code.upper()}",
                "home_score": int(home_comp.get("score", 0)),
                "away_score": int(away_comp.get("score", 0)),
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


def check_finished_games(league: str = "nfl") -> List[Dict[str, Any]]:
    """Fetches scoreboard and returns only games that have finished (STATUS_FINAL)."""
    data = fetch_espn_scoreboard(league)
    all_games = parse_scoreboard_events(data, league)
    return [g for g in all_games if g["status"] == "final"]
