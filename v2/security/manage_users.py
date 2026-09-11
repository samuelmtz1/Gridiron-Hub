#!/usr/bin/env python3
"""User Management CLI for Gridiron Hub 2.0.

Allows Sam and team to add, list, and manage authorized users locally
with salted PBKDF2 hashing, keeping passwords 100% off GitHub.
"""

from __future__ import annotations

import argparse
import getpass
import json
import secrets
import sqlite3
import sys
from pathlib import Path

# Ensure v2 package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from v2.security.auth import (
    AUTH_DB_PATH,
    hash_password,
    list_users,
    save_user,
)


def cmd_add_user(args: argparse.Namespace) -> None:
    username = args.username.strip().lower()
    if not username:
        print("❌ Error: El nombre de usuario no puede estar vacío.", file=sys.stderr)
        sys.exit(1)

    password = args.password
    if not password:
        password = getpass.getpass(f"Ingresa la contraseña para '{username}': ")
        confirm = getpass.getpass("Confirma la contraseña: ")
        if password != confirm:
            print("❌ Error: Las contraseñas no coinciden.", file=sys.stderr)
            sys.exit(1)

    if len(password) < 8:
        print("⚠️ Advertencia: Se recomienda una contraseña de al menos 8 caracteres.")

    pwhash = hash_password(password)
    save_user(username, pwhash, role=args.role)
    print(f"✅ Usuario '{username}' registrado exitosamente en {AUTH_DB_PATH} (Rol: {args.role}).")
    print("🔒 La contraseña fue hasheada con PBKDF2 (100,000 iteraciones) y está protegida contra fugas a Git.")


def cmd_list_users(args: argparse.Namespace) -> None:
    users = list_users()
    if not users:
        print("ℹ️ No hay usuarios registrados en el sistema.")
        print("👉 Crea uno con: python3 v2/security/manage_users.py add-user <nombre>")
        return

    print("\n🏈 Usuarios Autorizados en Gridiron Hub 2.0:")
    print("-" * 50)
    print(f"{'USUARIO':<20} {'ROL':<12} {'CREADO'}")
    print("-" * 50)
    for u in users:
        print(f"{u['username']:<20} {u['role']:<12} {u['created_at']}")
    print("-" * 50)


def cmd_delete_user(args: argparse.Namespace) -> None:
    username = args.username.strip().lower()
    if not AUTH_DB_PATH.exists():
        print("ℹ️ No existe la base de datos de usuarios.", file=sys.stderr)
        return
    with sqlite3.connect(AUTH_DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM team_users WHERE username = ?", (username,))
        conn.commit()
        if cursor.rowcount > 0:
            print(f"✅ Usuario '{username}' eliminado correctamente.")
        else:
            print(f"⚠️ El usuario '{username}' no fue encontrado.")


def cmd_generate_secret(args: argparse.Namespace) -> None:
    secret = secrets.token_hex(32)
    print("\n🔑 Token Criptográfico de Sesión Generado (32 bytes / 64 hex):")
    print(secret)
    print("\nPuedes configurar esto en tu entorno o en Render/Vercel como:")
    print(f"TEAM_SHARED_SECRET={secret}\n")


def cmd_export_env(args: argparse.Namespace) -> None:
    """Exports all local users into a JSON string for cloud deployment env variables."""
    if not AUTH_DB_PATH.exists():
        print("[]")
        return
    with sqlite3.connect(AUTH_DB_PATH) as conn:
        rows = conn.execute("SELECT username, password_hash, role FROM team_users").fetchall()
    export_data = [{"username": r[0], "password_hash": r[1], "role": r[2]} for r in rows]
    json_str = json.dumps(export_data)
    print("\n📦 Variable para Producción (Render / Vercel Secrets):")
    print(f"GRIDIRON_USERS_JSON='{json_str}'\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gestor de Usuarios para Gridiron Hub 2.0")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # add-user
    p_add = subparsers.add_parser("add-user", help="Crea o actualiza un usuario de equipo")
    p_add.add_argument("username", help="Nombre de usuario (ej. sam)")
    p_add.add_argument("--password", "-p", help="Contraseña opcional (si se omite se pide de forma oculta)")
    p_add.add_argument("--role", "-r", default="editor", choices=["admin", "editor", "viewer"], help="Rol del usuario")
    p_add.set_defaults(func=cmd_add_user)

    # list-users
    p_list = subparsers.add_parser("list-users", help="Lista los usuarios registrados")
    p_list.set_defaults(func=cmd_list_users)

    # delete-user
    p_del = subparsers.add_parser("delete-user", help="Elimina un usuario de equipo")
    p_del.add_argument("username", help="Nombre del usuario a eliminar")
    p_del.set_defaults(func=cmd_delete_user)

    # generate-secret
    p_sec = subparsers.add_parser("generate-secret", help="Genera una clave criptográfica para TEAM_SHARED_SECRET")
    p_sec.set_defaults(func=cmd_generate_secret)

    # export-env
    p_exp = subparsers.add_parser("export-env", help="Exporta los usuarios a JSON para Render / Vercel")
    p_exp.set_defaults(func=cmd_export_env)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
