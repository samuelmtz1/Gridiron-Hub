"""Highlight Selector for Gridiron Hub.

Identifies the top 3-5 game-defining plays based on Win Probability swing and EPA,
and generates smart search links (YouTube / ESPN) so editors can preview or clip
footage immediately without hosting heavy video files locally.
Cost: $0 perpetual.
"""

from __future__ import annotations

from typing import Any, Dict, List
import urllib.parse


def format_play_headline(play: Dict[str, Any]) -> str:
    """Creates a concise, impactful headline for a play."""
    qtr = play.get("quarter", 1)
    time_rem = play.get("time_remaining", "00:00")
    desc = play.get("description", "")
    
    # Extract player and action if possible
    prefix = f"[Q{qtr} {time_rem}]"
    if play.get("is_touchdown"):
        return f"{prefix} 🔥 TD: {desc}"
    elif play.get("is_turnover"):
        return f"{prefix} 🚨 TURNOVER: {desc}"
    return f"{prefix} ⚡ {desc}"


def generate_video_search_link(away_code: str, home_code: str, play_desc: str, season: int) -> str:
    """Generates an exact YouTube query link to quickly pull up video highlights."""
    # Trim description to key words
    short_desc = play_desc[:45].replace(",", " ").replace(".", "")
    query = f"{away_code} vs {home_code} {season} {short_desc}"
    return f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}"


def select_game_highlights(
    game: Dict[str, Any],
    plays: List[Dict[str, Any]],
    max_plays: int = 5
) -> List[Dict[str, Any]]:
    """Ranks and formats the game's top highlights with direct video search links."""
    away_code = game.get("away_code", "AWAY")
    home_code = game.get("home_code", "HOME")
    season = game.get("season", 2024)

    # Sort plays by WP swing descending, then by absolute EPA
    sorted_plays = sorted(
        plays,
        key=lambda p: (float(p.get("wp_swing", 0.0) or 0.0) * 10.0 + abs(float(p.get("epa", 0.0) or 0.0))),
        reverse=True
    )

    results = []
    for rank, p in enumerate(sorted_plays[:max_plays], start=1):
        headline = format_play_headline(p)
        video_url = p.get("clip_url") or generate_video_search_link(away_code, home_code, p.get("description", ""), season)
        wp_pct = round(float(p.get("wp_swing", 0.0) or 0.0) * 100, 1)

        results.append({
            "rank": rank,
            "play_id": p.get("play_id") or p.get("id"),
            "quarter": p.get("quarter"),
            "time_remaining": p.get("time_remaining"),
            "headline": headline,
            "description": p.get("description"),
            "epa": p.get("epa"),
            "wp_swing": p.get("wp_swing"),
            "wp_swing_pct": f"{wp_pct}%",
            "video_url": video_url,
        })

    return results
