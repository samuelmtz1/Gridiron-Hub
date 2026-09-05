"""Staging Mock Preview Runner for Gridiron Hub.

Standalone runner designed for Sam's eyes only:
- Spins up a staging environment populated with authentic Week 11 NFL/NCAA fixtures
- Serves the frontend analytics UI and REST API together on http://localhost:8000
- Generates ephemeral, secure local credentials for this session so zero secrets are checked into git.
- Allows testing UI changes, metric weights, and simulated game endings before pushing to production.
Cost: $0 perpetual.
"""

from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path
import uvicorn
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from api.main import app
from mock import dataset

# Set Staging Environment
STAGING_DB = PROJECT_ROOT / "storage" / "staging_mock.db"
os.environ["DATABASE_URL"] = f"sqlite:///{STAGING_DB}"
os.environ["APP_ENV"] = "mock_staging"

# Ephemeral local credentials for this session if not configured in .env
if not os.getenv("TEAM_USERNAME"):
    os.environ["TEAM_USERNAME"] = "staging_user"
if not os.getenv("TEAM_PASSWORD") and not os.getenv("TEAM_PASSWORD_HASH"):
    os.environ["TEAM_PASSWORD"] = secrets.token_hex(6)
if not os.getenv("TEAM_SHARED_SECRET"):
    os.environ["TEAM_SHARED_SECRET"] = secrets.token_hex(16)

# Mount Frontend static assets
FRONTEND_DIR = PROJECT_ROOT / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


def start_preview(port: int = 8000):
    """Initializes mock data and launches the preview web server."""
    username = os.environ["TEAM_USERNAME"]
    password = os.environ.get("TEAM_PASSWORD", "(configurado mediante hash)")

    print("=" * 70)
    print("🏈 GRIDIRON HUB — ENTORNO DE STAGING MOCK PREVIEW (SOLO PARA TUS OJOS)")
    print("=" * 70)
    print(f"📦 Base de datos de simulación: {STAGING_DB}")
    dataset.seed_mock_environment(custom_db_path=STAGING_DB)
    print("✅ Partidos simulados cargados (Chiefs @ Bills, Ravens @ Steelers, etc.)")
    print("✅ Métricas EPA, Win Probability Swings y Premios Semanales listos.")
    print("-" * 70)
    print("🔐 CREDENCIALES DE ACCESO PARA ESTA SESIÓN (GENERADAS EN MEMORIA):")
    print(f"   👤 Usuario:    {username}")
    print(f"   🔑 Contraseña: {password}")
    print("-" * 70)
    print("🚀 Plataforma lista para previsualización interactiva:")
    print(f"   👉 Abre tu navegador en: http://localhost:{port}")
    print(f"   👉 Documentación OpenAPI: http://localhost:{port}/docs")
    print("-" * 70)
    print("💡 Presiona CTRL+C en cualquier momento para detener el servidor.")
    print("=" * 70)

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    start_preview()
