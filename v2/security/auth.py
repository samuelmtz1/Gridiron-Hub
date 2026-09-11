"""Authentication and Cryptographic Security Engine for Gridiron Hub 2.0.

Features:
- Salted password hashing with PBKDF2-HMAC-SHA256 (100,000 rounds, 16-byte random salt).
- Constant-time verification to prevent timing attacks.
- Cryptographically signed HMAC-SHA256 session tokens with TTL and random nonces.
- Zero hardcoded fallback credentials: fails closed if no users are provisioned.
- Checks local secure storage (v2/storage/auth.db) or GRIDIRON_USERS_JSON env var.
Cost: $0 perpetual (Pure Python standard library).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import time
from typing import Any, Dict, List, Optional

# Secure ephemeral dev secret generated per process if TEAM_SHARED_SECRET is unset
_DEV_EPHEMERAL_SECRET = secrets.token_hex(32)

AUTH_DB_PATH = Path(__file__).resolve().parent.parent / "storage" / "auth.db"


def get_signing_secret() -> str:
    """Returns the HMAC signing key from environment or the secure runtime secret."""
    secret = os.getenv("TEAM_SHARED_SECRET")
    if secret and secret.strip() and secret != "your_secure_team_token_here":
        return secret.strip()
    if os.getenv("APP_ENV") == "production":
        raise RuntimeError("CRITICAL: TEAM_SHARED_SECRET must be explicitly set in production environments.")
    return _DEV_EPHEMERAL_SECRET


def hash_password(password: str) -> str:
    """Hashes a password with PBKDF2-HMAC-SHA256 using a unique 16-byte cryptographic salt."""
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string.")
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    key_b64 = base64.b64encode(key).decode("utf-8")
    return f"{salt_b64}${key_b64}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a password against a stored salt$hash using constant-time comparison."""
    if not password or not stored_hash or "$" not in stored_hash:
        return False
    try:
        salt_b64, key_b64 = stored_hash.split("$", 1)
        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected_key = base64.b64decode(key_b64.encode("utf-8"))
        computed_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(expected_key, computed_key)
    except Exception:
        return False


def _init_auth_db(db_path: Optional[Path] = None) -> None:
    """Initializes the local isolated users database if it does not exist."""
    target_path = db_path if db_path is not None else AUTH_DB_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(target_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS team_users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'editor',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()


def save_user(username: str, password_hash: str, role: str = "editor", db_path: Optional[Path] = None) -> None:
    """Saves or updates a team user in the local isolated auth database."""
    target_path = db_path if db_path is not None else AUTH_DB_PATH
    _init_auth_db(target_path)
    clean_user = username.strip().lower()
    with sqlite3.connect(target_path) as conn:
        conn.execute("""
            INSERT INTO team_users (username, password_hash, role)
            VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                role = excluded.role;
        """, (clean_user, password_hash, role))
        conn.commit()


def get_user_hash(username: str, db_path: Optional[Path] = None) -> Optional[str]:
    """Retrieves the password hash for a user from local DB or environment JSON."""
    clean_user = username.strip().lower()
    target_path = db_path if db_path is not None else AUTH_DB_PATH

    # 1. Check local auth database
    if target_path.exists():
        try:
            with sqlite3.connect(target_path) as conn:
                row = conn.execute(
                    "SELECT password_hash FROM team_users WHERE username = ?",
                    (clean_user,)
                ).fetchone()
                if row:
                    return row[0]
        except Exception:
            pass

    # 2. Check environment variable GRIDIRON_USERS_JSON (for cloud deployments)
    env_json = os.getenv("GRIDIRON_USERS_JSON")
    if env_json:
        try:
            users_list = json.loads(env_json)
            if isinstance(users_list, list):
                for u in users_list:
                    if u.get("username", "").strip().lower() == clean_user:
                        return u.get("password_hash")
            elif isinstance(users_list, dict):
                if clean_user in users_list:
                    val = users_list[clean_user]
                    return val if isinstance(val, str) else val.get("password_hash")
        except Exception:
            pass

    return None


def list_users(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Returns the list of configured usernames (never returns password hashes)."""
    target_path = db_path if db_path is not None else AUTH_DB_PATH
    users = []
    if target_path.exists():
        try:
            with sqlite3.connect(target_path) as conn:
                for row in conn.execute("SELECT username, role, created_at FROM team_users ORDER BY username"):
                    users.append({"username": row[0], "role": row[1], "created_at": row[2]})
        except Exception:
            pass

    env_json = os.getenv("GRIDIRON_USERS_JSON")
    if env_json:
        try:
            users_list = json.loads(env_json)
            if isinstance(users_list, list):
                for u in users_list:
                    uname = u.get("username", "").strip().lower()
                    if uname and not any(x["username"] == uname for x in users):
                        users.append({"username": uname, "role": u.get("role", "member"), "created_at": "env"})
        except Exception:
            pass

    return users


def authenticate_user(username: str, password: str, db_path: Optional[Path] = None) -> bool:
    """Authenticates a user against configured accounts. Zero hardcoded fallbacks."""
    if not username or not password:
        return False

    target_path = db_path if db_path is not None else AUTH_DB_PATH
    stored_hash = get_user_hash(username, db_path=target_path)
    if not stored_hash:
        # Perform a dummy constant-time operation to mitigate timing attacks on username existence
        _dummy_salt = b"\x00" * 16
        hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), _dummy_salt, 100_000)
        return False

    return verify_password(password, stored_hash)


def create_session_token(username: str, expires_in_seconds: int = 7 * 86400) -> str:
    """Generates a cryptographically signed HMAC-SHA256 session token."""
    clean_user = username.strip().lower()
    now = int(time.time())
    payload = {
        "sub": clean_user,
        "iat": now,
        "exp": now + expires_in_seconds,
        "nonce": secrets.token_hex(12),
        "v": 2,
    }
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")

    secret_key = get_signing_secret()
    signature = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    return f"{payload_b64}.{sig_b64}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies cryptographic signature and expiration of a session token."""
    if not token or "." not in token:
        return None
    try:
        payload_b64, sig_b64 = token.split(".", 1)

        secret_key = get_signing_secret()
        expected_sig = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")

        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None

        padding = "=" * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        payload = json.loads(payload_bytes.decode("utf-8"))

        now = int(time.time())
        if payload.get("exp", 0) < now:
            return None

        return payload
    except Exception:
        return None
