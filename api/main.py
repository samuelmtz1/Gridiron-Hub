"""FastAPI Application for Gridiron Hub.

Exposes REST JSON endpoints for:
- NFL and NCAA team metadata with official colors/logos
- Weekly game schedules, scores, and real-time state (Protected)
- Game deep dives (EPA efficiency, top plays by Win Probability swing, trivia) (Protected)
- Preselected weekly awards (OPOW, DPOW, MVP, DOs & DON'Ts) (Protected)
- YouTube studio script generator (Protected)
- Cryptographic session authentication & rate limiting
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
from security.auth import (
    authenticate_team_user,
    create_session_token,
    verify_session_token,
)
from security.middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
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

# Determine allowed CORS origins
cors_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

# Register middlewares: Starlette runs in reverse order of addition
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)


# ==============================================================================
# Authentication & Authorization Dependencies
# ==============================================================================


class LoginRequest(BaseModel):
    username: str
    password: str


def get_current_user(
    authorization: Optional[str] = Header(None),
    x_team_token: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Validates session token or fallback team secret token."""
    # Allow bypassing authentication if AUTH_REQUIRED is set to false in local dev/testing
    if os.getenv("AUTH_REQUIRED", "true").lower() in ("false", "0", "no"):
        return {"sub": "dev_user", "role": "dev"}

    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif x_team_token:
        # Backward compatibility for CI/cron workflows sending secret token
        configured_secret = os.getenv("TEAM_SHARED_SECRET")
        if configured_secret and configured_secret != "your_secure_team_token_here" and x_team_token == configured_secret:
            return {"sub": "ci_pipeline", "role": "admin"}
        token = x_team_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida. Inicie sesión para acceder a Gridiron Hub.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión expirado o inválido. Por favor inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def verify_team_token(user: Dict[str, Any] = Depends(get_current_user)) -> bool:
    """Verifies team authorization for admin/ingest endpoints."""
    return True


# ==============================================================================
# Public & System Endpoints
# ==============================================================================


@app.get("/", tags=["System"])
def root_info() -> Dict[str, Any]:
    """Root landing endpoint for Gridiron Hub API."""
    return {
        "service": "Gridiron Hub API",
        "status": "online",
        "version": "1.0.1",
        "docs": "/docs",
        "health": "/health",
        "message": "Bienvenido a Gridiron Hub API. El frontend está disponible en Vercel."
    }


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
        import logging
        logging.getLogger("api.main").error(f"Health check failure: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servicio."
        )


@app.post("/api/auth/login", tags=["Auth"])
def login(req: LoginRequest) -> Dict[str, Any]:
    """Authenticates team member credentials and issues a signed session token."""
    if not authenticate_team_user(req.username, req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas: Usuario o contraseña inválidos."
        )

    token = create_session_token(req.username)
    return {
        "status": "authenticated",
        "token": token,
        "username": req.username,
        "expires_in": 7 * 86400,
        "token_type": "Bearer"
    }


@app.get("/api/auth/verify", tags=["Auth"])
def verify_session(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Verifies that the provided session token is active, cryptographically signed, and not expired."""
    return {
        "status": "valid",
        "user": user.get("sub"),
        "expires_at": user.get("exp"),
    }


@app.get("/api/teams", tags=["Teams"])
def list_teams(
    league: Optional[str] = Query(None, description="'nfl' o 'ncaa'"),
    conference: Optional[str] = Query(None, description="'AFC', 'NFC', 'SEC', 'Big Ten', etc.")
) -> List[Dict[str, Any]]:
    """Lists teams filtered by league and/or conference with official hex colors and SVG logos."""
    return db.get_teams(league=league, conference=conference)


# ==============================================================================
# Protected Endpoints (Requires Valid Session)
# ==============================================================================


@app.get("/api/games", tags=["Games"])
def list_games(
    league: str = Query("nfl", description="'nfl' o 'ncaa'"),
    season: int = Query(2024, description="Año de la temporada"),
    week: int = Query(..., description="Número de semana (1-18)"),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Retrieves all games for a specific week with home/away teams and status."""
    return db.get_games_by_week(league=league, season=season, week=week)


@app.get("/api/games/{game_id}", tags=["Games"])
def get_game_detail(
    game_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
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
    category: Optional[str] = Query(None, description="OPOW, DPOW, MVP, INT_OF_WEEK, TD_OF_WEEK, DO, DONT"),
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Retrieves preselected award nominees with stat summaries, ranks, and highlight clips."""
    return db.get_awards(league=league, season=season, week=week, category=category)


@app.post("/api/seed/teams", tags=["Admin"])
def seed_default_teams(authorized: bool = Depends(verify_team_token)) -> Dict[str, Any]:
    """Seeds or refreshes the 32 NFL teams and top NCAA universities."""
    teams = assets_source.load_all_teams()
    db.save_teams(teams)
    return {"status": "success", "message": f"{len(teams)} equipos sincronizados correctamente."}


class IngestRequest(BaseModel):
    league: str = "nfl"
    season: int = 2024
    week: int = 11
    force: bool = False


@app.post("/api/ingest/run", tags=["Admin"])
def trigger_ingestion_pipeline(
    req: IngestRequest,
    authorized: bool = Depends(verify_team_token)
) -> Dict[str, Any]:
    """Manually triggers the ingestion and analytics pipeline."""
    from ingestion.pipeline import run_pipeline
    return run_pipeline(league=req.league, season=req.season, week=req.week, force=req.force)


@app.get("/api/scripts/generate", tags=["YouTube Studio"])
def generate_youtube_video_script(
    league: str = Query("nfl", description="'nfl' o 'ncaa'"),
    season: int = Query(2024, description="Temporada"),
    week: int = Query(11, description="Semana"),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Generates a structured, broadcast-ready YouTube script with timestamps and teleprompter text."""
    from processing.script_generator import build_youtube_script
    return build_youtube_script(league=league, season=season, week=week)
