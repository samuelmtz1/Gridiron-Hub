"""Trivia Engine for Gridiron Hub.

Generates narrative bullet points, records, and historical context per game
to feed directly into YouTube scriptwriting and teleprompters.
Cost: $0 perpetual.
"""

from __future__ import annotations

from typing import Any, Dict, List


def generate_game_trivia(
    game: Dict[str, Any],
    team_stats: List[Dict[str, Any]],
    key_plays: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Generates narrative talking points based on game events, score margin, and statistical thresholds."""
    trivia_items: List[Dict[str, Any]] = []
    game_id = game.get("id", "game")
    home_name = game.get("home_short") or game.get("home_code") or "Local"
    away_name = game.get("away_short") or game.get("away_code") or "Visitante"
    home_score = int(game.get("home_score") or 0)
    away_score = int(game.get("away_score") or 0)

    # 1. Margin and Outcome
    margin = abs(home_score - away_score)
    winner = home_name if home_score > away_score else away_name
    loser = away_name if home_score > away_score else home_name

    if margin == 0:
        trivia_items.append({
            "id": f"triv_{game_id}_tie",
            "game_id": game_id,
            "category": "milestone",
            "fact_text": f"Empate histórico entre {home_name} y {away_name} ({home_score}-{away_score}).",
        })
    elif margin <= 3:
        trivia_items.append({
            "id": f"triv_{game_id}_thriller",
            "game_id": game_id,
            "category": "record",
            "fact_text": f"Final de una sola posesión: {winner} se impone a {loser} por apenas {margin} punto(s).",
        })
    elif margin >= 24:
        trivia_items.append({
            "id": f"triv_{game_id}_blowout",
            "game_id": game_id,
            "category": "milestone",
            "fact_text": f"Victoria categórica por paliza: {winner} aplastó a {loser} por {margin} puntos de diferencia.",
        })

    # 2. Fourth Quarter Comebacks
    q4_lead_changes = [
        p for p in key_plays
        if p.get("quarter") == 4 and float(p.get("wp_swing", 0.0) or 0.0) >= 0.25
    ]
    if q4_lead_changes:
        trivia_items.append({
            "id": f"triv_{game_id}_clutch",
            "game_id": game_id,
            "category": "historical",
            "fact_text": f"Remontada en el 4to cuarto: El partido tuvo jugadas con más del 25% de cambio en probabilidad de victoria en los minutos finales.",
        })

    # 3. Defensive Dominance / Shootout Detection
    total_points = home_score + away_score
    if total_points >= 65:
        trivia_items.append({
            "id": f"triv_{game_id}_shootout",
            "game_id": game_id,
            "category": "record",
            "fact_text": f"Guerra de ofensivas: Se anotaron {total_points} puntos combinados, superando el promedio de la liga.",
        })
    elif total_points <= 20 and game.get("status") == "final":
        trivia_items.append({
            "id": f"triv_{game_id}_def_slugfest",
            "game_id": game_id,
            "category": "milestone",
            "fact_text": f"Duelo de trincheras: Las defensivas limitaron el juego a solo {total_points} puntos totales.",
        })

    # 4. Turnovers impact
    for stat in team_stats:
        if stat.get("turnovers", 0) >= 3:
            team_label = "la visita" if not stat.get("is_home") else "el anfitrión"
            trivia_items.append({
                "id": f"triv_{game_id}_to_{stat.get('team_id')}",
                "game_id": game_id,
                "category": "streak",
                "fact_text": f"Factor entregas de balón: {team_label} cometió {stat['turnovers']} pérdidas que marcaron el rumbo del encuentro.",
            })

    return trivia_items
