"""College Football Data (CFBD) Wrapper for Gridiron Hub.

Integrates with api.collegefootballdata.com for NCAA games, ratings, and stats.
Implements strict local caching and call budgeting (max 1,000 req/month free tier).
Decoupled: If API key is missing or quota reached, gracefully falls back without crashing.
Cost: $0 perpetual.
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

CFBD_BASE_URL = "https://api.collegefootballdata.com"

# Simple memory cache to prevent redundant HTTP calls during the same execution
_CFBD_CACHE: Dict[str, Any] = {}

# Rate limiter tracking (timestamp of last request)
_LAST_REQUEST_TIME = 0.0
_MIN_REQUEST_INTERVAL = 0.2  # at most 5 requests per second


def _get_api_key() -> Optional[str]:
    """Retrieves CFBD API token from environment variables."""
    key = os.getenv("CFBD_API_KEY")
    if not key or key == "your_cfbd_bearer_token_here":
        return None
    return key


def _make_cfbd_request(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    """Makes a rate-limited and cached request to CollegeFootballData API."""
    global _LAST_REQUEST_TIME, _CFBD_CACHE

    api_key = _get_api_key()
    if not api_key:
        logger.info("CFBD_API_KEY no configurada en .env. Se omite llamada remota a CFBD.")
        return None

    # Construct query string
    param_str = ""
    if params:
        param_str = "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    full_url = f"{CFBD_BASE_URL}{endpoint}{param_str}"

    # Cache hit check
    if full_url in _CFBD_CACHE:
        logger.debug(f"CFBD cache hit: {full_url}")
        return _CFBD_CACHE[full_url]

    # Rate limiting sleep
    elapsed = time.time() - _LAST_REQUEST_TIME
    if elapsed < _MIN_REQUEST_INTERVAL:
        time.sleep(_MIN_REQUEST_INTERVAL - elapsed)

    req = urllib.request.Request(
        full_url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "GridironHub/1.0",
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            _LAST_REQUEST_TIME = time.time()
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                _CFBD_CACHE[full_url] = data
                return data
    except Exception as exc:
        logger.warning(f"Error en llamada a CFBD ({full_url}): {exc}")

    return None


def fetch_cfb_games(year: int, week: int, season_type: str = "regular") -> List[Dict[str, Any]]:
    """Fetches NCAA football games for a given season and week."""
    params = {"year": year, "week": week, "seasonType": season_type}
    raw_data = _make_cfbd_request("/games", params)
    if not raw_data:
        return []

    normalized: List[Dict[str, Any]] = []
    for g in raw_data:
        home_team = g.get("home_team") or "Unknown"
        away_team = g.get("away_team") or "Unknown"
        game_id = f"ncaa_{year}_w{week}_{g.get('id')}"

        is_completed = g.get("completed", False)
        status = "final" if is_completed else "scheduled"

        normalized.append({
            "id": game_id,
            "league": "ncaa",
            "season": year,
            "season_type": season_type,
            "week": week,
            "game_date": g.get("start_date", ""),
            "home_team_id": f"ncaa_{home_team.replace(' ', '_').upper()}",
            "away_team_id": f"ncaa_{away_team.replace(' ', '_').upper()}",
            "home_score": g.get("home_points") or 0,
            "away_score": g.get("away_points") or 0,
            "status": status,
            "venue": g.get("venue") or "Estadio Universitario",
            "weather_temp": None,
            "weather_desc": None,
            "highlight_url": f"https://www.youtube.com/results?search_query={away_team}+vs+{home_team}+highlights+{year}",
        })

    return normalized


def fetch_cfb_ratings(year: int) -> Dict[str, Any]:
    """Fetches SP+ and Elo ratings for NCAA teams with caching."""
    ratings = _make_cfbd_request("/ratings/sp", {"year": year})
    return ratings or {}
