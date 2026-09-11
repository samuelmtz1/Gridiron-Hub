"""Tests for Authentication & Cryptographic Session Security (Gridiron Hub 2.0)."""

import json
import os
import time
from pathlib import Path
import pytest

from v2.security.auth import (
    authenticate_user,
    create_session_token,
    get_user_hash,
    hash_password,
    list_users,
    save_user,
    verify_password,
    verify_session_token,
)


@pytest.fixture
def temp_auth_db(tmp_path):
    return tmp_path / "test_auth.db"


def test_password_hashing_and_verification():
    raw_pass = "MiPasswordSeguro2026!"
    hashed = hash_password(raw_pass)

    assert "$" in hashed
    assert hashed != raw_pass

    # Verify correct password succeeds
    assert verify_password(raw_pass, hashed) is True

    # Verify incorrect password fails
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(raw_pass, "invalid_hash_string") is False


def test_local_user_management(temp_auth_db):
    username = "sam"
    pwhash = hash_password("SuperSecureKey123!")

    save_user(username, pwhash, role="admin", db_path=temp_auth_db)

    # Verify lookup
    retrieved = get_user_hash("sam", db_path=temp_auth_db)
    assert retrieved == pwhash

    # Authenticate valid
    assert authenticate_user("sam", "SuperSecureKey123!", db_path=temp_auth_db) is True
    assert authenticate_user("sam", "WrongPassword", db_path=temp_auth_db) is False

    # Non-existent user fails
    assert authenticate_user("unknown_user", "AnyPassword", db_path=temp_auth_db) is False

    # List users
    users = list_users(db_path=temp_auth_db)
    assert len(users) == 1
    assert users[0]["username"] == "sam"
    assert users[0]["role"] == "admin"
    assert "password_hash" not in users[0]


def test_session_token_cryptography():
    username = "sam"
    token = create_session_token(username, expires_in_seconds=3600)

    assert token is not None
    assert "." in token

    payload = verify_session_token(token)
    assert payload is not None
    assert payload["sub"] == "sam"
    assert payload["v"] == 2

    # Tampered signature fails
    parts = token.split(".", 1)
    tampered = f"{parts[0]}.invalid_signature_bits"
    assert verify_session_token(tampered) is None

    # Expired token fails
    expired_token = create_session_token(username, expires_in_seconds=-10)
    assert verify_session_token(expired_token) is None


def test_env_json_user_support(monkeypatch, tmp_path):
    empty_db = tmp_path / "empty.db"
    pwhash = hash_password("CloudSecret2026!")

    env_config = json.dumps([
        {"username": "cloud_sam", "password_hash": pwhash, "role": "admin"}
    ])
    monkeypatch.setenv("GRIDIRON_USERS_JSON", env_config)

    assert authenticate_user("cloud_sam", "CloudSecret2026!", db_path=empty_db) is True
    assert authenticate_user("cloud_sam", "WrongPassword", db_path=empty_db) is False

