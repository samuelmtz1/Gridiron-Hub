---
name: security-audit
description: Security verification skill to guarantee zero secrets in Git, validate PBKDF2 hashing, and verify session token validity.
metadata:
  standard: skills.sh/v1
  framework: antigravity-awesome-skills
---

# Security Audit Skill (Gridiron Hub 2.0)

## Propósito
Verificar que ningún secreto, token, contraseña en texto claro ni archivo sensible sea rastreado por Git, y validar que los mecanismos criptográficos operen a prueba de ataques de temporización y fuerza bruta.

## Chequeos de Seguridad
1. **Inspección de Archivos Ignorados:**
   - Comprobar que `.env`, `.env.local`, `v2/storage/auth.db`, `*.sqlite3` y `*.key` estén en `.gitignore`.
2. **Escaneo de Patrones:**
   - Ejecutar `v2/security/isolation.py` para asegurar que palabras clave como `DEFAULT_TEAM_PASSWORD` o botones de llenado automático no existan en ningún archivo fuente.
3. **Validación de PBKDF2:**
   - Confirmar 100,000 iteraciones en PBKDF2-HMAC-SHA256 con sal aleatoria de 16 bytes.
4. **Verificación de Tokens:**
   - Validar que los tokens de sesión expiren en el plazo establecido y utilicen firmas HMAC-SHA256 con `hmac.compare_digest`.
