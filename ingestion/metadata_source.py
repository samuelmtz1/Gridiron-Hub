"""Metadata Source for Gridiron Hub.

Fetches team and venue metadata (stadium, capacity, bio) from TheSportsDB public API.
Free public ID: 123. Cost: $0 perpetual.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

THESPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123"
_META_CACHE: Dict[str, Any] = {}


def fetch_team_metadata(team_name: str) -> Optional[Dict[str, Any]]:
    """Fetches stadium and team background from TheSportsDB."""
    clean_name = urllib.parse.quote(team_name)
    url = f"{THESPORTSDB_BASE}/searchteams.php?t={clean_name}"

    if url in _META_CACHE:
        return _META_CACHE[url]

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GridironHub/1.0 (Research Automation)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                teams = data.get("teams") or []
                if teams:
                    info = teams[0]
                    result = {
                        "stadium": info.get("strStadium"),
                        "stadium_capacity": info.get("intStadiumCapacity"),
                        "city": info.get("strLocation"),
                        "formed_year": info.get("intFormedYear"),
                        "description": info.get("strDescriptionEN"),
                    }
                    _META_CACHE[url] = result
                    return result
    except Exception as exc:
        logger.debug(f"Error fetching metadata from TheSportsDB: {exc}")

    return None
