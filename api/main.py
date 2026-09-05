"""FastAPI Application for Gridiron Hub.

Exposes REST JSON endpoints for:
- NFL and NCAA team metadata with official colors/logos
- Weekly game schedules, scores, and real-time state
- Game deep dives (EPA efficiency, top plays by Win Probability swing, trivia)
- Preselected weekly awards (OPOW, DPOW, MVP, DOs & DON'Ts)
Cost: $0 perpetual.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingestion import assets_source
from storage import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the SQLite schema on startup and seeds default team assets if empty."""
    db.init_db()
    existing_teams = db.get_teams()
    if not existing_teams:
        all_teams = assets_source.load_all_teams()
        db.save_teams(all_teams)
    yield


app = FastAPI(
    title="Gridiron Hub API",
    description="Internal research & production API for NFL/NCAA YouTube content.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local React/Vite development and web dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_team_token(x_team_token: Optional[str] = Header(None)) -> bool:
    """Verifies team secret token for administrative/ingest endpoints."""
    configured_secret = os.getenv("TEAM_SHARED_SECRET")
    # If no secret is configured, allow in local development
    if not configured_secret or configured_secret == "your_secure_team_token_here":
        return True
    if x_team_token != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso denegado: Token de equipo inválido (X-Team-Token)."
        )
    return True


# ==============================================================================
# Endpoints
# ==============================================================================


@app.get("/health", tags=["System"])
def health_check() -> Dict[str, Any]:
    """Returns service health, active environment, and database connectivity status."""
    try:
        teams = db.get_teams()
        return {
            "status": "healthy",
            "environment": os.getenv("APP_ENV", "development"),
            "database": "connected",
            "total_teams": len(teams),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database check failed: {exc}"
        )


@app.get("/api/teams", tags=["Teams"])
def list_teams(
    league: Optional[str] = Query(None, description="'nfl' o 'ncaa'"),
    conference: Optional[str] = Query(None, description="'AFC', 'NFC', 'SEC', 'Big Ten', etc.")
) -> List[Dict[str, Any]]:
    """Lists teams filtered by league and/or conference with official hex colors and SVG logos."""
    return db.get_teams(league=league, conference=conference)


@app.get("/api/games", tags=["Games"])
def list_games(
    league: str = Query("nfl", description="'nfl' o 'ncaa'"),
    season: int = Query(2024, description="Año de la temporada"),
    week: int = Query(..., description="Número de semana (1-18)")
) -> List[Dict[str, Any]]:
    """Retrieves all games for a specific week with home/away teams and status."""
    return db.get_games_by_week(league=league, season=season, week=week)


@app.get("/api/games/{game_id}", tags=["Games"])
def get_game_detail(game_id: str) -> Dict[str, Any]:
    """Returns complete game breakdown: boxscore stats, top plays by WP swing, and trivia."""
    game_data = db.get_game_details(game_id)
    if not game_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partido con ID '{game_id}' no encontrado."
        )
    return game_data


@app.get("/api/awards", tags=["Awards"])
def list_awards(
    league: str = Query("nfl", description="'nfl' o 'ncaa'"),
    season: int = Query(2024, description="Temporada"),
    week: int = Query(..., description="Semana"),
    category: Optional[str] = Query(None, description="OPOW, DPOW, MVP, INT_OF_WEEK, TD_OF_WEEK, DO, DONT")
) -> List[Dict[str, Any]]:
    """Retrieves preselected award nominees with stat summaries, ranks, and highlight clips."""
    return db.get_awards(league=league, season=season, week=week, category=category)


@app.post("/api/seed/teams", tags=["Admin"])
def seed_default_teams(authorized: bool = Depends(verify_team_token)) -> Dict[str, Any]:
    """Seeds or refreshes the 32 NFL teams and top NCAA universities."""
    teams = assets_source.load_all_teams()
    db.save_teams(teams)
    return {"status": "success", "message": f"{len(teams)} equipos sincronizados correctamente."}

