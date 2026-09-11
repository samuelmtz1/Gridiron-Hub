"""FastAPI Application for Gridiron Hub 2.0.

Provides REST JSON endpoints for:
- NFL and NCAA team metadata with official colors, logos, conferences & 8 NFL divisions.
- Authenticated game schedules, live state, and ESPN event_id binding.
- Game deep dives: boxscore, EPA efficiency, top plays by Win Probability swing, trivia.
- Preselected weekly awards (OPOW, DPOW, MVP, DOs & DON'Ts).
- Zero-leak authentication with PBKDF2 and HMAC-SHA256 session tokens.
Cost: $0 perpetual.
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from v2.ingestion import assets_engine, espn_client
from v2.security.auth import (
    authenticate_user,
    create_session_token,
    verify_session_token,
)
from v2.storage import db

logger = logging.getLogger("v2.api.main")
SNAPSHOT_FILE = Path(__file__).resolve().parent.parent / "storage" / "v2_snapshot.json"
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes SQLite schema, saves canonical teams, and seeds snapshot if empty."""
    db.init_db()
    all_teams = assets_engine.load_all_teams()
    db.save_teams(all_teams)

    # Seed snapshot if games table is empty
    with db.get_connection() as conn:
        games_count = conn.execute("SELECT count(*) FROM games").fetchone()[0]

    if games_count == 0 and SNAPSHOT_FILE.exists():
        try:
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                snap = json.load(f)
                if snap.get("teams"):
                    db.save_teams(snap["teams"])
                if snap.get("games"):
                    db.save_games(snap["games"])
                for g in snap.get("games", []):
                    if g.get("team_stats"):
                        db.save_game_team_stats(g["team_stats"])
                    if g.get("key_plays"):
                        db.save_key_plays(g["key_plays"])
                    if g.get("trivia"):
                        db.save_game_trivia(g["trivia"])
                if snap.get("awards"):
                    db.save_awards_candidates(snap["awards"])
            logger.info("Snapshot v2 sembrado exitosamente en la base de datos.")
        except Exception as exc:
            logger.warning(f"Error al sembrar snapshot v2: {exc}")

    yield


app = FastAPI(
    title="Gridiron Hub 2.0 API",
    description="Internal research & production API for NFL/NCAA YouTube content (Lookbook Theme).",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
cors_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "null",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# Authentication Dependency
def get_current_user(
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    token = x_session_token
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida. Proporciona X-Session-Token o Authorization: Bearer <token>",
        )

    payload = verify_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión inválido o expirado.",
        )

    return payload


# --- SCHEMAS ---

class LoginRequest(BaseModel):
    username: str
    password: str


class SyncRequest(BaseModel):
    league: str = "nfl"
    season: int = 2026
    week: int = 1


# --- ENDPOINTS ---

@app.get("/")
def root(request: Request):
    accept = request.headers.get("accept", "")
    index_file = FRONTEND_DIR / "index.html"
    if "text/html" in accept and index_file.exists():
        return FileResponse(str(index_file))
    return {
        "system": "Gridiron Hub 2.0",
        "status": "operational",
        "version": "2.0.0",
        "theme": "Lookbook Dark/Red/White",
        "auth": "PBKDF2-HMAC-SHA256 (Zero-leak)",
    }


@app.get("/api/v2/health")
def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "database": "sqlite3_wal",
    }


@app.post("/api/v2/auth/login")
def login(creds: LoginRequest):
    username = creds.username.strip().lower()
    if not authenticate_user(username, creds.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o usuario no configurado.",
        )

    token = create_session_token(username)
    return {
        "status": "success",
        "token": token,
        "username": username,
    }


@app.get("/api/v2/auth/verify")
def verify_session(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "status": "authenticated",
        "user": user["sub"],
        "expires_at": user.get("exp"),
    }


@app.get("/api/v2/teams")
def list_teams(
    league: Optional[str] = Query(None, description="Filtrar por 'nfl' o 'ncaa'"),
    conference: Optional[str] = Query(None, description="Filtrar por conferencia"),
    division: Optional[str] = Query(None, description="Filtrar por división"),
):
    teams = db.get_teams(league=league)
    if conference:
        teams = [t for t in teams if (t.get("conference") or "").upper() == conference.upper()]
    if division:
        teams = [t for t in teams if (t.get("division") or "").upper() == division.upper()]
    return teams


@app.get("/api/v2/games")
def list_games(
    league: Optional[str] = Query("nfl", description="'nfl' o 'ncaa'"),
    season: Optional[int] = Query(2026),
    week: Optional[int] = Query(1),
    division: Optional[str] = Query(None, description="Filtrar por división/conferencia (ej. 'AFC West')"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    games = db.get_games(league=league, season=season, week=week)

    if division and division != "ALL":
        d_upper = division.upper()
        filtered = []
        for g in games:
            h_conf = (g.get("home_conference") or "").upper()
            a_conf = (g.get("away_conference") or "").upper()
            h_div = (g.get("home_division") or "").upper()
            a_div = (g.get("away_division") or "").upper()

            # Conference match
            if d_upper in (h_conf, a_conf):
                filtered.append(g)
            # Division match (e.g., 'AFC WEST')
            elif d_upper.startswith("AFC ") or d_upper.startswith("NFC "):
                target_div = d_upper.split(" ", 1)[1]
                target_conf = d_upper.split(" ", 1)[0]
                if (h_conf == target_conf and h_div == target_div) or (a_conf == target_conf and a_div == target_div):
                    filtered.append(g)
        games = filtered

    return games


@app.get("/api/v2/games/{game_id}")
def get_game_detail(
    game_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    game = db.get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partido no encontrado.")
    return game


@app.post("/api/v2/games/{game_id}/live-summary")
def sync_live_game_summary(
    game_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Fetches live boxscore and plays from ESPN for a specific game and updates database."""
    game = db.get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partido no encontrado.")

    event_id = game.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="El partido no tiene un event_id asociado de ESPN.")

    summary = espn_client.fetch_espn_game_summary(event_id, league=game["league"], app_game_id=game["id"])
    if not summary:
        raise HTTPException(status_code=502, detail="No se pudo obtener el resumen desde ESPN.")

    if summary.get("team_stats"):
        db.save_game_team_stats(summary["team_stats"])
    if summary.get("key_plays"):
        db.save_key_plays(summary["key_plays"])

    return db.get_game_by_id(game_id)


@app.get("/api/v2/awards")
def list_awards(
    league: Optional[str] = Query("nfl"),
    season: Optional[int] = Query(2026),
    week: Optional[int] = Query(1),
    user: Dict[str, Any] = Depends(get_current_user),
):
    return db.get_awards(league=league, season=season, week=week)


@app.post("/api/v2/sync")
def sync_week(
    req: SyncRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Triggers on-demand ingestion for a week from ESPN Scoreboard."""
    if req.league.lower() == "nfl":
        from v2.ingestion.nfl_engine import ingest_nfl_week
        result = ingest_nfl_week(season=req.season, week=req.week)
    else:
        from v2.ingestion.ncaa_engine import ingest_ncaa_week
        result = ingest_ncaa_week(season=req.season, week=req.week)
    return result


# Mount Static Frontend (Lookbook Theme)
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

