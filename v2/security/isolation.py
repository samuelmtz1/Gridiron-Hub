"""Isolation and Secret Leak Verification Engine for Gridiron Hub 2.0.

Provides automated checks to ensure no plaintext passwords, default mock logins,
or uncommitted database files leak into the Git index.
"""

from __future__ import annotations

import os
from pathlib import Path
import re
from typing import List, Tuple

FORBIDDEN_PATTERNS = [
    (r"fillTeamCredentials", "Función insegura de autocompletado detectada"),
    (r"Gridiron2026!", "Contraseña por defecto insegura de v1 encontrada"),
    (r"gridiron_team", "Usuario por defecto no autorizado en v2"),
    (r"DEFAULT_TEAM_PASSWORD", "Variable de contraseña en duro detectada"),
    (r"DEFAULT_TEAM_USERNAME", "Variable de usuario en duro detectada"),
]

SENSITIVE_FILES_GITIGNORED = [
    ".env",
    ".env.local",
    "v2/storage/auth.db",
    "auth.db",
    "gridiron_v2.db",
]


def check_v2_code_for_leaks(v2_root: Path) -> List[Tuple[str, int, str]]:
    """Scans all code files in v2 to ensure zero prohibited credentials or backdoors exist."""
    findings = []
    extensions = {".py", ".js", ".html", ".css", ".json", ".sql", ".sh"}

    for root, dirs, files in os.walk(v2_root):
        # Skip pycache and tests that check for forbidden strings
        if "__pycache__" in root or ".pytest_cache" in root:
            continue
        for f in files:
            file_path = Path(root) / f
            if file_path.suffix not in extensions:
                continue
            # Allow isolation scanner test itself to reference patterns
            if file_path.name == "isolation.py" or file_path.name == "test_v2_isolation.py":
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                lines = content.splitlines()
                for idx, line in enumerate(lines, 1):
                    for pattern, desc in FORBIDDEN_PATTERNS:
                        if re.search(pattern, line):
                            findings.append((str(file_path.relative_to(v2_root)), idx, desc))
            except Exception:
                pass

    return findings


def verify_gitignore(gitignore_path: Path) -> List[str]:
    """Verifies that essential sensitive files and databases are listed in .gitignore."""
    missing = []
    if not gitignore_path.exists():
        return SENSITIVE_FILES_GITIGNORED

    content = gitignore_path.read_text(encoding="utf-8")
    for s in SENSITIVE_FILES_GITIGNORED:
        if s not in content and f"*{Path(s).suffix}" not in content:
            missing.append(s)

    return missing
