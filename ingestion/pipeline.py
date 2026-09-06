"""Ingestion & Analytics Pipeline for Gridiron Hub.

Master orchestrator executed post-game (Sunday/Saturday nights):
1. Detects completed games via ESPN scoreboard trigger.
2. Ingests Play-by-Play & Player Weekly Stats (nflreadpy / cfbd).
3. Computes EPA and Win Probability swings.
4. Generates Weekly Awards (OPOW, DPOW, MVP, DOs & DON'Ts) and Game Trivia.
5. Persists all analytics to local storage (SQLite/DuckDB).
Cost: $0 perpetual.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ingestion import assets_source, live_trigger, nfl_source, cfb_source
from processing import awards_engine, highlight_selector, trivia_engine
from storage import db

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(asctime)s - %(message)s")
logger = logging.getLogger("GridironPipeline")


def run_pipeline(
    league: str = "nfl",
    season: int = 2024,
    week: int = 11,
    force: bool = False,
    custom_db_path: Optional[str | Path] = None
) -> Dict[str, Any]:
    """Executes the full post-game data pipeline for a given league, season, and week."""
    logger.info(f"🏈 Iniciando Pipeline de Ingesta Gridiron Hub: {league.upper()} {season} Semana {week}")

    # 1. Ensure DB and Teams are seeded
    db.init_db(custom_path=custom_db_path)
    existing_teams = db.get_teams(league=league, custom_path=custom_db_path)
    if not existing_teams:
        logger.info(f"Sincronizando directorio oficial de equipos ({league.upper()}) con logos y paletas hex...")
        teams = assets_source.load_all_teams()
        db.save_teams([t for t in teams if t["league"] == league], custom_path=custom_db_path)

    target_games: List[Dict[str, Any]] = []
    player_stats: List[Dict[str, Any]] = []

    if league == "nfl":
        # Check nflreadpy schedules first
        logger.info(f"Consultando calendario oficial NFL en nflreadpy ({season} Semana {week})...")
        nfl_games = nfl_source.fetch_nfl_games(season=season, week=week)
        if nfl_games:
            logger.info(f"Cargados {len(nfl_games)} partidos oficiales NFL de nflreadpy.")
            db.save_games(nfl_games, custom_path=custom_db_path)
            target_games = nfl_games

            # Ingest team stats & key plays from real PBP
            logger.info(f"Extrayendo estadísticas avanzadas de equipo y jugadas clave (EPA/WPA) para {season} Semana {week}...")
            pbp_data = nfl_source.fetch_nfl_team_stats_and_plays(season=season, week=week)
            if pbp_data.get("team_stats"):
                db.save_game_team_stats(pbp_data["team_stats"], custom_path=custom_db_path)
            if pbp_data.get("key_plays"):
                db.save_key_plays(pbp_data["key_plays"], custom_path=custom_db_path)
        else:
            # Fallback to ESPN scoreboard
            logger.info("Partidos no disponibles en nflreadpy; consultando ESPN Scoreboard...")
            sb_data = live_trigger.fetch_espn_scoreboard("nfl", season=season, week=week)
            target_games = live_trigger.parse_scoreboard_events(sb_data, league="nfl")
            if target_games:
                db.save_games(target_games, custom_path=custom_db_path)

        # Ingest player stats
        logger.info(f"Extrayendo estadísticas de jugadores para NFL {season} Semana {week}...")
        player_stats = nfl_source.fetch_nfl_player_stats(season=season, week=week)
        if player_stats:
            db.save_player_weekly_stats(player_stats, custom_path=custom_db_path)

    elif league == "ncaa":
        # Ingest from ESPN College Football Scoreboard
        logger.info(f"Consultando ESPN Scoreboard para NCAA ({season} Semana {week})...")
        sb_data = live_trigger.fetch_espn_scoreboard("ncaa", season=season, week=week)
        ncaa_teams = live_trigger.extract_teams_from_scoreboard(sb_data, league="ncaa")
        if ncaa_teams:
            logger.info(f"Registrando {len(ncaa_teams)} equipos de NCAA con logos y conferencias...")
            db.save_teams(ncaa_teams, custom_path=custom_db_path)

        target_games = live_trigger.parse_scoreboard_events(sb_data, league="ncaa")
        if target_games:
            logger.info(f"Cargados {len(target_games)} partidos de NCAA desde ESPN.")
            db.save_games(target_games, custom_path=custom_db_path)

            # Ingest boxscores & scoring plays for final or active games
            for g in target_games[:25]:  # Process top 25 featured games to remain fast
                eid = g.get("event_id")
                if eid:
                    summary = live_trigger.fetch_espn_game_summary(eid, league="ncaa", app_game_id=g["id"])
                    if summary.get("teams"):
                        db.save_teams(summary["teams"], custom_path=custom_db_path)
                    if summary.get("team_stats"):
                        db.save_game_team_stats(summary["team_stats"], custom_path=custom_db_path)
                    if summary.get("key_plays"):
                        db.save_key_plays(summary["key_plays"], custom_path=custom_db_path)

    # 4. Generate Awards Nominees (OPOW, DPOW, MVP, DOs & DON'Ts)
    logger.info("Ejecutando motor de premios y selección de jugadas clave...")
    all_key_plays: List[Dict[str, Any]] = []
    for g in target_games:
        details = db.get_game_details(g["id"], custom_path=custom_db_path)
        if details and details.get("key_plays"):
            all_key_plays.extend(details["key_plays"])

    awards_candidates = awards_engine.generate_all_weekly_awards(
        league=league,
        season=season,
        week=week,
        player_stats=player_stats,
        key_plays=all_key_plays
    )

    if awards_candidates:
        db.save_awards_candidates(awards_candidates, custom_path=custom_db_path)
        logger.info(f"Guardados {len(awards_candidates)} candidatos a premios semanales.")

    # 5. Generate Game Trivia
    trivia_count = 0
    for g in target_games:
        game_details = db.get_game_details(g["id"], custom_path=custom_db_path)
        if game_details:
            t_stats = game_details.get("team_stats", [])
            k_plays = game_details.get("key_plays", [])
            trivia_items = trivia_engine.generate_game_trivia(g, t_stats, k_plays)
            if trivia_items:
                db.save_game_trivia(trivia_items, custom_path=custom_db_path)
                trivia_count += len(trivia_items)

    logger.info(f"✅ Pipeline completado exitosamente: {len(target_games)} partidos, {len(awards_candidates)} premios, {trivia_count} viñetas de trivia.")

    return {
        "status": "success",
        "league": league,
        "season": season,
        "week": week,
        "games_processed": len(target_games),
        "awards_generated": len(awards_candidates),
        "trivia_generated": trivia_count,
    }


def main():
    """CLI entrypoint for running ingestion pipeline manually."""
    parser = argparse.ArgumentParser(description="Gridiron Hub Post-Game Pipeline")
    parser.add_argument("--league", choices=["nfl", "ncaa"], default="nfl", help="Liga a procesar")
    parser.add_argument("--season", type=int, default=2024, help="Temporada (ej. 2024)")
    parser.add_argument("--week", type=int, default=11, help="Semana a procesar (1-18)")
    parser.add_argument("--force", action="store_true", help="Forzar re-ingesta")
    args = parser.parse_args()

    result = run_pipeline(league=args.league, season=args.season, week=args.week, force=args.force)
    print(result)


if __name__ == "__main__":
    main()
