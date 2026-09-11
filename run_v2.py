#!/usr/bin/env python3
"""One-Click Platform Launcher for Gridiron Hub 2.0.

Starts the FastAPI server with unified static frontend hosting,
verifies the SQLite storage, and opens the Lookbook dashboard in the browser.
Usage:
    python3 run_v2.py
"""

from __future__ import annotations

import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import webbrowser

ROOT_DIR = Path(__file__).resolve().parent
VENV_PYTHON = ROOT_DIR / "venv" / "bin" / "python3"
VENV_UVICORN = ROOT_DIR / "venv" / "bin" / "uvicorn"


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def ensure_dependencies() -> str:
    """Returns the path to the best available Python interpreter."""
    if VENV_PYTHON.exists():
        return str(VENV_PYTHON)
    return sys.executable


def init_platform() -> None:
    """Ensures database schema and snapshot data are initialized."""
    print("⚡ Inicializando base de datos y esquema de Gridiron Hub 2.0...")
    try:
        from v2.storage import db
        db.init_db()
        print("✅ Base de datos SQLite v2 verificada.")
    except Exception as e:
        print(f"⚠️ Nota sobre inicialización DB: {e}")


def main() -> None:
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"

    print("=" * 60)
    print("🏈  GRIDIRON HUB 2.0 — LOOKBOOK EDITION")
    print("=" * 60)

    # 1. Initialize storage
    init_platform()

    # 2. Check if port is already active
    if is_port_in_use(port, host):
        print(f"⚠️ El puerto {port} ya está en uso. Es posible que el servidor ya esté corriendo.")
        print(f"🌐 Abriendo navegador en: {url}")
        webbrowser.open(url)
        print("\nPara reiniciar el servidor, detén el proceso anterior y vuelve a ejecutar este script.")
        return

    python_bin = ensure_dependencies()
    print(f"🚀 Iniciando servidor backend y frontend unificados en {url}...")
    print(f"🔒 Sistema de autenticación aislado activo.")
    print(f"📋 Usa 'Ctrl + C' para detener la plataforma.")
    print("-" * 60)

    cmd = [
        python_bin,
        "-m",
        "uvicorn",
        "v2.api.main:app",
        "--host",
        host,
        "--port",
        str(port),
    ]

    process = subprocess.Popen(cmd, cwd=str(ROOT_DIR))

    # Wait for server to become responsive
    max_wait = 10
    start_time = time.time()
    server_ready = False

    while time.time() - start_time < max_wait:
        if is_port_in_use(port, host):
            server_ready = True
            break
        time.sleep(0.3)

    if server_ready:
        print(f"✅ Plataforma lista. Abriendo {url} en tu navegador...")
        webbrowser.open(url)
    else:
        print(f"⏳ El servidor está arrancando. Visita manualmente {url} en tu navegador.")

    try:
        process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo Gridiron Hub 2.0...")
        process.terminate()
        process.wait(timeout=5)
        print("👋 Plataforma cerrada correctamente.")


if __name__ == "__main__":
    main()
