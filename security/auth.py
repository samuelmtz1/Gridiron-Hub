"""Authentication and Cryptographic Security Module for Gridiron Hub.

Implements:
- Salted password hashing with PBKDF2-HMAC-SHA256 (100,000 iterations).
- Cryptographically signed session tokens with HMAC-SHA256 and expiration tracking.
- Constant-time string comparisons to prevent timing attacks.
- Zero hardcoded fallback secrets: fails closed unless configured in environment.
Pure Python standard library. Cost: $0 perpetual.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Dict, Optional

# Ephemeral in-memory key generated per process lifecycle if TEAM_SHARED_SECRET is not configured
_DEV_EPHEMERAL_SECRET = secrets.token_hex(32)


def get_signing_secret() -> str:
    """Retrieves secret key from environment or returns an ephemeral in-memory secret in dev/testing."""
    secret = os.getenv("TEAM_SHARED_SECRET")
    if secret and secret != "your_secure_team_token_here":
        return secret
    if os.getenv("APP_ENV") == "production":
        raise RuntimeError("CRITICAL CONFIG ERROR: TEAM_SHARED_SECRET must be configured in production.")
    return _DEV_EPHEMERAL_SECRET


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique 16-byte random salt."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    key_b64 = base64.b64encode(key).decode("utf-8")
    return f"{salt_b64}${key_b64}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a password against a stored salt$hash using constant-time comparison."""
    try:
        salt_b64, key_b64 = stored_hash.split("$")
        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected_key = base64.b64decode(key_b64.encode("utf-8"))
        computed_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(expected_key, computed_key)
    except Exception:
        return False


def create_session_token(username: str, expires_in_seconds: int = 7 * 86400) -> str:
    """Generates an HMAC-signed session token with expiration timestamp."""
    now = int(time.time())
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + expires_in_seconds,
        "nonce": secrets.token_hex(8)
    }
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")

    secret_key = get_signing_secret()
    signature = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    return f"{payload_b64}.{sig_b64}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies the cryptographic signature and validity/expiration of a session token."""
    try:
        if not token or "." not in token:
            return None

        payload_b64, sig_b64 = token.split(".", 1)

        # Verify signature
        secret_key = get_signing_secret()
        expected_sig = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")

        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None

        # Decode payload
        padding = "=" * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Check expiration
        now = int(time.time())
        if payload.get("exp", 0) < now:
            return None

        return payload
    except Exception:
        return None


def authenticate_team_user(username: str, password: str) -> bool:
    """Validates user credentials against configured team environment variables.
    Fails closed if credentials are not configured in environment.
    """
    expected_user = os.getenv("TEAM_USERNAME")
    if not expected_user:
        return False

    if not hmac.compare_digest(username, expected_user):
        return False

    stored_hash = os.getenv("TEAM_PASSWORD_HASH")
    if stored_hash:
        return verify_password(password, stored_hash)

    expected_pass = os.getenv("TEAM_PASSWORD")
    if expected_pass:
        return hmac.compare_digest(password, expected_pass)

    return False
