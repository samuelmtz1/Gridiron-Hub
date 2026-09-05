# Políticas y Arquitectura de Ciberseguridad — Gridiron Hub

Este documento y los módulos de esta carpeta definen las directrices, mecanismos de defensa en profundidad y mitigaciones técnicas aplicadas en Gridiron Hub.

---

## 1. Auditoría de Seguridad & Arquitectura (Opción 1: Vercel + Render)
El documento completo de auditoría de arquitectura, modelo de amenazas (STRIDE) y mitigaciones OWASP se encuentra en:
👉 [`security/ARCHITECTURE_AUDIT_OPTION1.md`](./ARCHITECTURE_AUDIT_OPTION1.md)

---

## 2. Autenticación y Criptografía (`security/auth.py`)
Gridiron Hub protege los guiones de YouTube, analíticas avanzadas (EPA, WP Swing) y endpoints administrativos mediante credenciales privadas:
* **Hashing de Contraseñas con Sal:** PBKDF2 con HMAC-SHA256 y 100,000 iteraciones + sal aleatoria de 16 bytes.
* **Tokens de Sesión Criptográficos:** HMAC-SHA256 con marcas de tiempo `iat`/`exp` (expiración a 7 días) y comparación en tiempo constante (`hmac.compare_digest`) para mitigar ataques de temporización (timing attacks).
* **Cero Secretos Hardcodeados (Fail-Closed):** El código no contiene usuarios ni contraseñas estáticas de respaldo. Si no se configuran `TEAM_USERNAME` y `TEAM_PASSWORD_HASH` (o `TEAM_PASSWORD`), el sistema deniega el acceso inmediatamente.
* **Claves de Firma Efímeras:** En entornos locales/desarrollo sin `TEAM_SHARED_SECRET`, se genera una clave criptográfica aleatoria en memoria por ejecución (`secrets.token_hex(32)`), impidiendo que tokens firmados puedan ser falsificados desde GitHub.
* **Generación de Hash desde CLI:**
  ```bash
  python3 -c "from security.auth import hash_password; print(hash_password('tu_password_secreto'))"
  ```
  El resultado se asigna a la variable de entorno `TEAM_PASSWORD_HASH`.

---

## 3. Blindaje OWASP & Rate Limiting (`security/middleware.py`)
* **Cabeceras de Seguridad Inyectadas:**
  * `X-Frame-Options: DENY`: Protección contra Clickjacking.
  * `X-Content-Type-Options: nosniff`: Prevención de MIME-sniffing.
  * `X-XSS-Protection: 1; mode=block`: Filtro XSS en navegadores legados.
  * `Referrer-Policy: strict-origin-when-cross-origin`: Privacidad de cabeceras de referencia.
  * `Permissions-Policy`: Restricción total de APIs de hardware del navegador (cámara, micrófono, geolocalización, pagos).
  * `Content-Security-Policy`: Restricción estricta de orígenes permitidos (self, ESPN CDN, Google Fonts).
  * `Strict-Transport-Security (HSTS)`: Fuerza HTTPS con `max-age=31536000` en entornos de producción.
* **Protección contra Fuerza Bruta (Rate Limiting):**
  * Limitador en ventana deslizante en memoria para `/api/auth/login`.
  * Máximo 5 intentos fallidos consecutivos por IP cada 60 segundos antes de emitir un bloqueo temporal `HTTP 429 Too Many Requests` con cabecera `Retry-After`.

---

## 4. Detección de Secretos (Gitleaks)
* Se escanean todos los commits antes de enviarse a ramas remotas.
* **Pre-commit hook local:** Ejecutar `gitleaks protect --staged` antes de confirmar cambios.
* **CI Automático:** El workflow `.github/workflows/gitleaks.yml` bloquea Pull Requests con secretos expuestos.

---

## 5. Manejo de Credenciales y Principio de Menor Privilegio
* Ningún token o clave privada se coloca en código duro.
* Todas las claves se configuran en `.env` (ignorado en `.gitignore`) o en el panel seguro de Render / Vercel.
* **Regla de Oro de Git Flow:** La rama `main` está protegida; únicamente Sam realiza merges finales. Todo desarrollo entra primero a `develop`.
