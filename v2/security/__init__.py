"""Security and Authentication Module for Gridiron Hub 2.0.

Provides PBKDF2 password hashing, cryptographically signed session tokens,
and local isolated credential management with zero leaks to Git.
"""

from .auth import (
    authenticate_user,
    create_session_token,
    hash_password,
    verify_password,
    verify_session_token,
)

__all__ = [
    "authenticate_user",
    "create_session_token",
    "hash_password",
    "verify_password",
    "verify_session_token",
]
