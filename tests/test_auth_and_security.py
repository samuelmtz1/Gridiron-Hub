"""Unit and integration tests for Gridiron Hub Authentication & Cybersecurity Hardening.

Covers:
- Salted password hashing (PBKDF2-HMAC-SHA256) and constant-time verification.
- HMAC-SHA256 cryptographic session tokens and tamper detection.
- Fail-closed security behavior: zero hardcoded fallback passwords.
- Production safety: refuses to run without configured secrets.
- POST /api/auth/login and GET /api/auth/verify endpoints.
- OWASP Security Headers (X-Frame-Options, CSP, nosniff, etc.).
- Sliding-window rate limiter blocking brute force login attempts (HTTP 429).
"""

import time
import pytest
from fastapi.testclient import TestClient

from api.main import app
from security.auth import (
    authenticate_team_user,
    create_session_token,
    get_signing_secret,
    hash_password,
    verify_password,
    verify_session_token,
)
from security.middleware import login_rate_limiter

TEST_USER = "test_analyst"
TEST_PASS = "test_secure_password_987!"
TEST_SECRET = "test_signing_key_32_bytes_long_secret_123"


@pytest.fixture(autouse=True)
def setup_test_auth_env(monkeypatch):
    """Configures isolated test credentials in environment for test execution."""
    monkeypatch.setenv("TEAM_USERNAME", TEST_USER)
    monkeypatch.setenv("TEAM_PASSWORD", TEST_PASS)
    monkeypatch.setenv("TEAM_SHARED_SECRET", TEST_SECRET)
    login_rate_limiter.reset()
    yield
    login_rate_limiter.reset()


def test_password_hashing_and_verification():
    """Verifies that passwords are salted, hashed, and verifiable."""
    pwd = "superSecretPassword123!"
    hashed = hash_password(pwd)

    # Must contain salt$hash format
    assert "$" in hashed
    parts = hashed.split("$")
    assert len(parts) == 2

    # Verification success
    assert verify_password(pwd, hashed) is True

    # Verification failure on wrong password
    assert verify_password("wrongPassword", hashed) is False
    assert verify_password("", hashed) is False


def test_session_token_tampering_and_expiration():
    """Verifies HMAC cryptographic signature integrity and expiration."""
    username = TEST_USER
    token = create_session_token(username, expires_in_seconds=3600)

    # Valid token decodes correctly
    payload = verify_session_token(token)
    assert payload is not None
    assert payload["sub"] == username
    assert payload["exp"] > time.time()

    # Tampered payload fails signature check
    tampered = "a" + token[1:]
    assert verify_session_token(tampered) is None

    # Tampered signature fails
    body, sig = token.split(".", 1)
    bad_sig_token = f"{body}.invalidSignatureValue"
    assert verify_session_token(bad_sig_token) is None

    # Expired token is rejected
    expired_token = create_session_token(username, expires_in_seconds=-10)
    assert verify_session_token(expired_token) is None


def test_auth_fails_closed_when_no_credentials_configured(monkeypatch):
    """Verifies that authentication fails closed if environment credentials are absent."""
    monkeypatch.delenv("TEAM_USERNAME", raising=False)
    monkeypatch.delenv("TEAM_PASSWORD", raising=False)
    monkeypatch.delenv("TEAM_PASSWORD_HASH", raising=False)

    with TestClient(app) as client:
        resp = client.post(
            "/api/auth/login",
            json={"username": "any_user", "password": "any_password"}
        )
        assert resp.status_code == 401


def test_production_fails_if_secret_missing(monkeypatch):
    """Verifies that production mode prevents running without TEAM_SHARED_SECRET."""
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("TEAM_SHARED_SECRET", raising=False)

    with pytest.raises(RuntimeError, match="CRITICAL CONFIG ERROR"):
        get_signing_secret()


def test_api_auth_login_success():
    """Verifies POST /api/auth/login with valid credentials yields a session token."""
    with TestClient(app) as client:
        resp = client.post(
            "/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASS}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "authenticated"
        assert "token" in data
        assert data["username"] == TEST_USER
        assert data["token_type"] == "Bearer"

        # Verify issued token
        payload = verify_session_token(data["token"])
        assert payload["sub"] == TEST_USER


def test_api_auth_login_failure():
    """Verifies POST /api/auth/login with invalid credentials returns 401."""
    with TestClient(app) as client:
        resp = client.post(
            "/api/auth/login",
            json={"username": TEST_USER, "password": "IncorrectPassword"}
        )
        assert resp.status_code == 401
        data = resp.json()
        assert "Credenciales incorrectas" in data["detail"]


def test_api_auth_verify_endpoint():
    """Verifies GET /api/auth/verify validates active sessions."""
    token = create_session_token("analyst_user")

    with TestClient(app) as client:
        # Valid token
        resp = client.get("/api/auth/verify", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "valid"
        assert data["user"] == "analyst_user"

        # Missing token
        resp_anon = client.get("/api/auth/verify")
        assert resp_anon.status_code == 401

        # Invalid token
        resp_bad = client.get("/api/auth/verify", headers={"Authorization": "Bearer bad.token.val"})
        assert resp_bad.status_code == 401


def test_owasp_security_headers_present():
    """Verifies that all OWASP defense-in-depth headers are injected."""
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200

        # Check OWASP headers
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in resp.headers.get("Permissions-Policy", "")
        assert "default-src 'self'" in resp.headers.get("Content-Security-Policy", "")


def test_rate_limiting_blocks_brute_force():
    """Verifies that 5 failed login attempts trigger HTTP 429 Too Many Requests."""
    login_rate_limiter.reset()

    with TestClient(app) as client:
        # Perform 5 failed login attempts
        for i in range(5):
            resp = client.post(
                "/api/auth/login",
                json={"username": TEST_USER, "password": f"wrong_pass_{i}"}
            )
            assert resp.status_code == 401

        # 6th attempt must be blocked by rate limiter
        blocked_resp = client.post(
            "/api/auth/login",
            json={"username": TEST_USER, "password": "wrong_pass_6"}
        )
        assert blocked_resp.status_code == 429
        data = blocked_resp.json()
        assert "Demasiados intentos fallidos" in data["detail"]
        assert "Retry-After" in blocked_resp.headers
        assert int(blocked_resp.headers["Retry-After"]) > 0
