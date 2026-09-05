"""Awards Engine for Gridiron Hub.

Automates the preselection of weekly award nominees for YouTube content production.
Based on Expected Points Added (EPA) and Win Probability (WP) swing:
- OPOW / DPOW: Offensive/Defensive Player of the Week
- MVP of the Week
- Interception of the Week (Largest WP swing on interception)
- Touchdown of the Week (Largest WP swing or yardage on TD)
- Special Teams of the Week (Top EPA in kicking/field position plays)
- DOs and DON'Ts (Plays with highest positive and most negative EPA)
Cost: $0 perpetual.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import urllib.parse


def _build_highlight_search_url(player_name: str, team_code: str, query_type: str = "highlights") -> str:
    """Constructs a direct YouTube search link for rapid editing/preview."""
    query = f"{player_name} {team_code} {query_type}"
    encoded = urllib.parse.quote_plus(query)
    return f"https://www.youtube.com/results?search_query={encoded}"


def select_opow_candidates(player_stats: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Selects Offensive Player of the Week nominees based on highest offensive EPA."""
    offensive_positions = {"QB", "RB", "WR", "TE", "FB"}
    filtered = [
        p for p in player_stats
        if p.get("position") in offensive_positions or (p.get("epa_pass", 0) + p.get("epa_rush", 0)) > 0
    ]

    # Sort by total offensive EPA
    filtered.sort(
        key=lambda x: (float(x.get("epa_pass", 0.0) or 0.0) + float(x.get("epa_rush", 0.0) or 0.0) + float(x.get("epa_total", 0.0) or 0.0)),
        reverse=True
    )

    candidates = []
    for rank, p in enumerate(filtered[:top_n], start=1):
        name = p.get("player_name", "Desconocido")
        team_id = p.get("team_id", "")
        team_code = team_id.replace("nfl_", "").replace("ncaa_", "")
        
        # Build summary
        stat_parts = []
        if p.get("pass_yards"):
            stat_parts.append(f"{p['pass_yards']} yds pase")
        if p.get("pass_td"):
            stat_parts.append(f"{p['pass_td']} TD pase")
        if p.get("rush_yards"):
            stat_parts.append(f"{p['rush_yards']} yds corrida")
        if p.get("rush_td"):
            stat_parts.append(f"{p['rush_td']} TD corrida")
        if p.get("rec_yards"):
            stat_parts.append(f"{p['rec_yards']} yds rec")
        if p.get("rec_td"):
            stat_parts.append(f"{p['rec_td']} TD rec")

        epa_val = round(float(p.get("epa_total") or (p.get("epa_pass", 0) + p.get("epa_rush", 0))), 2)
        summary = ", ".join(stat_parts) + f" | +{epa_val} EPA"

        candidates.append({
            "category": "OPOW",
            "candidate_name": name,
            "team_id": team_id,
            "stat_summary": summary,
            "metric_value": epa_val,
            "clip_url": _build_highlight_search_url(name, team_code, "week highlights"),
            "rank": rank,
        })

    return candidates


def select_dpow_candidates(player_stats: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Selects Defensive Player of the Week nominees based on turnovers, sacks, and tackles."""
    def defensive_score(p: Dict[str, Any]) -> float:
        ints = float(p.get("interceptions", 0) or 0) * 8.0
        sacks = float(p.get("sacks", 0.0) or 0.0) * 4.0
        tackles = float(p.get("tackles", 0) or 0) * 0.8
        def_epa = abs(float(p.get("epa_defense", 0.0) or 0.0)) * 2.0
        return ints + sacks + tackles + def_epa

    scored = sorted(player_stats, key=defensive_score, reverse=True)

    candidates = []
    for rank, p in enumerate(scored[:top_n], start=1):
        name = p.get("player_name", "Desconocido")
        team_id = p.get("team_id", "")
        team_code = team_id.replace("nfl_", "").replace("ncaa_", "")

        stat_parts = []
        if p.get("interceptions"):
            stat_parts.append(f"{p['interceptions']} INT")
        if p.get("sacks"):
            stat_parts.append(f"{p['sacks']} Sacks")
        if p.get("tackles"):
            stat_parts.append(f"{p['tackles']} Tackles")

        score = round(defensive_score(p), 2)
        summary = ", ".join(stat_parts) if stat_parts else f"Impacto defensivo (+{score})"

        candidates.append({
            "category": "DPOW",
            "candidate_name": name,
            "team_id": team_id,
            "stat_summary": summary,
            "metric_value": score,
            "clip_url": _build_highlight_search_url(name, team_code, "defensive plays"),
            "rank": rank,
        })

    return candidates


def select_mvp_candidates(player_stats: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Selects overall MVP nominees combining total EPA impact."""
    sorted_players = sorted(player_stats, key=lambda x: float(x.get("epa_total", 0.0) or 0.0), reverse=True)

    candidates = []
    for rank, p in enumerate(sorted_players[:top_n], start=1):
        name = p.get("player_name", "Desconocido")
        team_id = p.get("team_id", "")
        team_code = team_id.replace("nfl_", "").replace("ncaa_", "")
        epa_val = round(float(p.get("epa_total", 0.0) or 0.0), 2)

        candidates.append({
            "category": "MVP",
            "candidate_name": name,
            "team_id": team_id,
            "stat_summary": f"Mayor impacto global neto: +{epa_val} EPA",
            "metric_value": epa_val,
            "clip_url": _build_highlight_search_url(name, team_code, "mvp performance"),
            "rank": rank,
        })

    return candidates


def select_turnover_of_the_week(key_plays: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Selects top turnovers/interceptions by highest Win Probability swing."""
    turnovers = [
        p for p in key_plays
        if p.get("is_turnover") == 1 or p.get("play_type") in ["interception", "fumble"]
    ]
    turnovers.sort(key=lambda x: float(x.get("wp_swing", 0.0) or 0.0), reverse=True)

    candidates = []
    for rank, play in enumerate(turnovers[:top_n], start=1):
        swing_pct = round(float(play.get("wp_swing", 0.0) or 0.0) * 100.0, 1)
        candidates.append({
            "category": "INT_OF_WEEK",
            "candidate_name": play.get("description", "")[:60] + "...",
            "team_id": play.get("possession_team_id", ""),
            "stat_summary": f"WP Swing: +{swing_pct}% | {play.get('time_remaining', '')} Q{play.get('quarter', 1)}",
            "metric_value": play.get("wp_swing", 0.0),
            "clip_url": play.get("highlight_url") or "https://youtube.com",
            "rank": rank,
        })

    return candidates


def select_td_of_the_week(key_plays: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Selects top touchdowns by Win Probability swing or EPA."""
    tds = [p for p in key_plays if p.get("is_touchdown") == 1 or "TOUCHDOWN" in p.get("description", "").upper()]
    tds.sort(key=lambda x: (float(x.get("wp_swing", 0.0) or 0.0) * 2.0 + float(x.get("epa", 0.0) or 0.0)), reverse=True)

    candidates = []
    for rank, play in enumerate(tds[:top_n], start=1):
        epa = round(float(play.get("epa", 0.0) or 0.0), 2)
        swing_pct = round(float(play.get("wp_swing", 0.0) or 0.0) * 100.0, 1)
        candidates.append({
            "category": "TD_OF_WEEK",
            "candidate_name": play.get("description", "")[:60] + "...",
            "team_id": play.get("possession_team_id", ""),
            "stat_summary": f"+{epa} EPA | WP Swing: {swing_pct}% | Q{play.get('quarter', 1)}",
            "metric_value": epa,
            "clip_url": play.get("highlight_url") or "https://youtube.com",
            "rank": rank,
        })

    return candidates


def select_special_teams_of_the_week(key_plays: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """Selects top special teams plays (blocked kicks, return TDs, clutch field goals)."""
    st_plays = [
        p for p in key_plays
        if p.get("play_type") in ["field_goal", "punt", "kickoff", "extra_point"] or "KICK" in p.get("description", "").upper()
    ]
    st_plays.sort(key=lambda x: (float(x.get("wp_swing", 0.0) or 0.0) * 3.0 + abs(float(x.get("epa", 0.0) or 0.0))), reverse=True)

    candidates = []
    for rank, play in enumerate(st_plays[:top_n], start=1):
        epa = round(float(play.get("epa", 0.0) or 0.0), 2)
        candidates.append({
            "category": "SPECIAL_TEAMS",
            "candidate_name": play.get("description", "")[:60] + "...",
            "team_id": play.get("possession_team_id", ""),
            "stat_summary": f"Impacto EPA: {epa} | Q{play.get('quarter', 1)} {play.get('time_remaining', '')}",
            "metric_value": epa,
            "clip_url": play.get("highlight_url") or "https://youtube.com",
            "rank": rank,
        })

    return candidates


def select_dos_and_donts(key_plays: List[Dict[str, Any]], top_n: int = 3) -> Dict[str, List[Dict[str, Any]]]:
    """Classifies the week's greatest masterstrokes (Top EPA) and costliest blunders (Lowest EPA)."""
    sorted_by_epa = sorted(key_plays, key=lambda x: float(x.get("epa", 0.0) or 0.0), reverse=True)

    dos = []
    for rank, play in enumerate(sorted_by_epa[:top_n], start=1):
        epa = round(float(play.get("epa", 0.0) or 0.0), 2)
        dos.append({
            "category": "DO",
            "candidate_name": play.get("description", "")[:60] + "...",
            "team_id": play.get("possession_team_id", ""),
            "stat_summary": f"Jugada Maestra (+{epa} EPA) | {play.get('yardline', '')}",
            "metric_value": epa,
            "clip_url": play.get("highlight_url") or "https://youtube.com",
            "rank": rank,
        })

    donts = []
    for rank, play in enumerate(reversed(sorted_by_epa[-top_n:]), start=1):
        epa = round(float(play.get("epa", 0.0) or 0.0), 2)
        donts.append({
            "category": "DONT",
            "candidate_name": play.get("description", "")[:60] + "...",
            "team_id": play.get("possession_team_id", ""),
            "stat_summary": f"Error Garrafal ({epa} EPA) | {play.get('yardline', '')}",
            "metric_value": epa,
            "clip_url": play.get("highlight_url") or "https://youtube.com",
            "rank": rank,
        })

    return {"dos": dos, "donts": donts}


def generate_all_weekly_awards(
    league: str,
    season: int,
    week: int,
    player_stats: List[Dict[str, Any]],
    key_plays: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Generates the full suite of award nominees ready for database persistence."""
    all_nominees: List[Dict[str, Any]] = []

    opow = select_opow_candidates(player_stats, top_n=3)
    dpow = select_dpow_candidates(player_stats, top_n=3)
    mvp = select_mvp_candidates(player_stats, top_n=3)
    turnovers = select_turnover_of_the_week(key_plays, top_n=3)
    tds = select_td_of_the_week(key_plays, top_n=3)
    st = select_special_teams_of_the_week(key_plays, top_n=3)
    dos_donts = select_dos_and_donts(key_plays, top_n=3)

    raw_collections = opow + dpow + mvp + turnovers + tds + st + dos_donts["dos"] + dos_donts["donts"]

    for item in raw_collections:
        item_id = f"award_{league}_{season}_w{week}_{item['category'].lower()}_{item['rank']}"
        all_nominees.append({
            "id": item_id,
            "league": league,
            "season": season,
            "week": week,
            "category": item["category"],
            "candidate_name": item["candidate_name"],
            "team_id": item["team_id"],
            "stat_summary": item["stat_summary"],
            "metric_value": item["metric_value"],
            "clip_url": item["clip_url"],
            "rank": item["rank"],
        })

    return all_nominees
