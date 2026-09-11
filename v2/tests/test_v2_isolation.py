"""Tests for Secrets and Credential Isolation (Zero Leak Policy)."""

from pathlib import Path
from v2.security.isolation import check_v2_code_for_leaks, verify_gitignore

V2_ROOT = Path(__file__).resolve().parent.parent
GITIGNORE_PATH = V2_ROOT.parent / ".gitignore"


def test_zero_credential_leaks_in_v2():
    """Guarantees that no passwords in plaintext, autofill functions, or default mock credentials exist in v2."""
    leaks = check_v2_code_for_leaks(V2_ROOT)
    assert len(leaks) == 0, f"Fugas de credenciales detectadas en v2: {leaks}"


def test_sensitive_files_are_gitignored():
    """Verifies that all secret stores and local databases are listed in .gitignore."""
    missing = verify_gitignore(GITIGNORE_PATH)
    assert len(missing) == 0, f"Archivos sensibles faltantes en .gitignore: {missing}"

