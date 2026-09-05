"""Security Middlewares for Gridiron Hub.

Implements:
1. OWASP Security Headers (X-Frame-Options, X-Content-Type-Options, CSP, HSTS, Referrer-Policy).
2. Sliding-window IP Rate Limiter to prevent brute force attacks on /api/auth/login.
Cost: $0 perpetual. Pure Python standard library + Starlette/FastAPI.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Dict, List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects defensive HTTP security headers aligned with OWASP Top 10 recommendations."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Anti-Clickjacking: Prevent embedding inside iframes on untrusted domains
        response.headers["X-Frame-Options"] = "DENY"

        # Anti-MIME Sniffing: Force browser to respect declared content-type
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Cross-Site Scripting Protection filter
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer Policy: Send full URL on same-origin, origin-only on HTTPS cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy: Disable invasive browser hardware APIs
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # Content Security Policy (CSP): Allow self, ESPN logo CDN, and inline styles for SPA
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' https:; "
            "script-src 'self' 'unsafe-inline' https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https:; "
            "font-src 'self' https://fonts.gstatic.com data: https:; "
            "img-src 'self' data: https: https://a.espncdn.com; "
            "connect-src 'self' https: http://localhost:* http://127.0.0.1:*;"
        )

        # HTTP Strict Transport Security (HSTS): Enforce HTTPS in production
        is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        if is_https or os.getenv("APP_ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


class LoginRateLimiter:
    """Sliding-window rate limiter for authentication endpoints."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.failed_attempts: Dict[str, List[float]] = defaultdict(list)

    def _clean_old_attempts(self, client_ip: str, now: float) -> None:
        self.failed_attempts[client_ip] = [
            t for t in self.failed_attempts[client_ip]
            if now - t < self.window_seconds
        ]

    def is_rate_limited(self, client_ip: str) -> bool:
        now = time.time()
        self._clean_old_attempts(client_ip, now)
        return len(self.failed_attempts[client_ip]) >= self.max_attempts

    def record_failure(self, client_ip: str) -> None:
        now = time.time()
        self._clean_old_attempts(client_ip, now)
        self.failed_attempts[client_ip].append(now)

    def record_success(self, client_ip: str) -> None:
        """Clear failed attempts for client IP upon successful login."""
        if client_ip in self.failed_attempts:
            del self.failed_attempts[client_ip]

    def get_retry_after(self, client_ip: str) -> int:
        now = time.time()
        self._clean_old_attempts(client_ip, now)
        if not self.failed_attempts[client_ip]:
            return 0
        oldest = self.failed_attempts[client_ip][0]
        remaining = int(self.window_seconds - (now - oldest))
        return max(1, remaining)

    def reset(self) -> None:
        """Clears all rate limit records (useful for test suites)."""
        self.failed_attempts.clear()


# Singleton rate limiter instance
login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Intercepts requests to /api/auth/login and enforces brute force protection."""

    def __init__(self, app, limiter: Optional[LoginRateLimiter] = None):
        super().__init__(app)
        self.limiter = limiter or login_rate_limiter

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path == "/api/auth/login" and request.method == "POST":
            # Extract IP behind proxies (Render/Vercel)
            forwarded = request.headers.get("x-forwarded-for")
            client_ip = forwarded.split(",")[0].strip() if forwarded else (
                request.client.host if request.client else "127.0.0.1"
            )

            if self.limiter.is_rate_limited(client_ip):
                retry_after = self.limiter.get_retry_after(client_ip)
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Demasiados intentos fallidos de inicio de sesión. Por favor espere antes de reintentar.",
                        "retry_after_seconds": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

            response = await call_next(request)

            if response.status_code == 401:
                self.limiter.record_failure(client_ip)
            elif response.status_code == 200:
                self.limiter.record_success(client_ip)

            return response

        return await call_next(request)
