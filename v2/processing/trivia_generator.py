"""Narrative Trivia and Historical Context Generator for Gridiron Hub 2.0.

Generates storytelling bullet points for YouTube video production.
"""

from __future__ import annotations

from typing import Any, Dict, List


def generate_game_trivia(game: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generates narrative trivia bullets for a game based on score, teams, and rivalry."""
    h_score = game.get("home_score", 0)
    a_score = game.get("away_score", 0)
    h_code = game.get("home_code", "")
    a_code = game.get("away_code", "")
    league = game.get("league", "nfl").upper()

    trivia = []
    gid = game.get("id", "game")

    # Score margin trivia
    diff = abs(h_score - a_score)
    if game.get("status") == "final":
        if diff == 0:
            trivia.append({
                "id": f"triv_{gid}_tie",
                "game_id": gid,
                "category": "milestone",
                "fact_text": f"Empate histórico entre {a_code} y {h_code} ({a_score}-{h_score}).",
            })
        elif diff <= 3:
            trivia.append({
                "id": f"triv_{gid}_close",
                "game_id": gid,
                "category": "milestone",
                "fact_text": f"Final de infarto decidido por apenas {diff} punto{'s' if diff > 1 else ''}.",
            })
        elif diff >= 24:
            trivia.append({
                "id": f"triv_{gid}_blowout",
                "game_id": gid,
                "category": "stat_quirk",
                "fact_text": f"Dominio absoluto con una paliza de {diff} puntos de ventaja.",
            })

    # Division / Rivalry notes
    h_div = game.get("home_division")
    a_div = game.get("away_division")
    h_conf = game.get("home_conference")
    a_conf = game.get("away_conference")

    if h_div and h_div == a_div and h_conf == a_conf:
        trivia.append({
            "id": f"triv_{gid}_divisional",
            "game_id": gid,
            "category": "rivalry",
            "fact_text": f"Duelo divisional crucial en la {h_conf} {h_div} con implicaciones directas de postemporada.",
        })
    elif h_conf and h_conf == a_conf:
        trivia.append({
            "id": f"triv_{gid}_conf",
            "game_id": gid,
            "category": "rivalry",
            "fact_text": f"Enfrentamiento dentro de la conferencia {h_conf} ({league}).",
        })

    # Default contextual bullet if none generated
    if not trivia:
        trivia.append({
            "id": f"triv_{gid}_context",
            "game_id": gid,
            "category": "historical",
            "fact_text": f"Duelo {a_code} visitando a {h_code} en la Semana {game.get('week', 1)} de {game.get('season', 2026)}.",
        })

    return trivia
