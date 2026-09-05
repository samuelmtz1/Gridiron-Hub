# 🛡️ Auditoría de Ciberseguridad y Arquitectura de Protección — Gridiron Hub

> **Alcance:** Despliegue en la Nube (Opción 1: Frontend en Vercel + Backend en Render + Ingesta en GitHub Actions).  
> **Objetivo:** Garantizar la confidencialidad de los guiones e ideas del canal, la protección de tokens y la integridad del sistema a costo $0 perpetuo.

---

## 1. Modelo de Amenazas (Threat Modeling)

Para proteger **Gridiron Hub** de accesos no autorizados, fugas de contenido antes de grabar y consumo malicioso de cuotas de APIs, se evaluaron los siguientes vectores según el modelo **STRIDE**:

| Amenaza | Vector Potencial | Impacto en Gridiron Hub | Nivel de Riesgo Inicial | Mitigación Implementada |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing (Suplantación)** | Intento de adivinar credenciales del equipo para acceder al Hub. | Acceso no autorizado a guiones y premios antes de grabar. | **ALTO** | Hashing PBKDF2-HMAC-SHA256 + Tokens de sesión firmados criptográficamente. |
| **Tampering (Alteración)** | Manipulación de llamadas a la base de datos o inyección SQL. | Corrupción de estadísticas o datos de juegos. | **MEDIO** | Consultas parametrizadas con SQLite + validación de tipos estricta con Pydantic. |
| **Information Disclosure (Fuga de Información)** | Almacenar API keys en el frontend o commits públicos. | Bloqueo de cuotas de CollegeFootballData o clonación de la web. | **CRÍTICO** | Gitleaks en dos capas + variables de entorno exclusivas del servidor (nunca viajan al navegador). |
| **Denial of Service (Denegación)** | Ataques de fuerza bruta continuos en el formulario de Login. | Saturación del contenedor gratuito de Render. | **ALTO** | Rate Limiter por IP (máximo 5 intentos fallidos por minuto antes de bloqueo temporal). |
| **Elevation of Privilege** | Peticiones directas a endpoints administrativos (`/api/ingest/run`). | Disparo no autorizado de procesos pesados de scraping. | **ALTO** | Verificación de token `X-Team-Token` y sesión autenticada. |

---

## 2. Medidas de Seguridad Técnicas Implementadas

### A. Autenticación y Criptografía (`security/auth.py`)
1. **Contraseñas Robustas con Sal (Salted Hashing):**
   * Se utiliza **PBKDF2 con HMAC-SHA256** y **100,000 iteraciones**.
   * Cada contraseña tiene un salt aleatorio de 16 bytes. Es resistente a ataques de tablas rainbow y GPU cracking.
2. **Tokens de Sesión Firmados:**
   * Al iniciar sesión con éxito, el servidor genera un token firmado con una clave secreta (`JWT_SECRET_KEY` o `TEAM_SHARED_SECRET`).
   * El token contiene marca de tiempo de emisión y tiempo de expiración (7 días). Cualquier token alterado es rechazado inmediatamente.

### B. Blindaje de Red y Middleware OWASP (`security/middleware.py`)
1. **CORS Estricto de Lista Blanca:**
   * Se eliminó el comodín inseguro `allow_origins=["*"]`.
   * Solo se admiten peticiones originadas desde el dominio autorizado de Vercel (`https://gridiron-hub.vercel.app`) y desde desarrollo local (`http://localhost:5173`, `http://localhost:8000`).
2. **Cabeceras HTTP de Seguridad (OWASP Secure Headers):**
   * `X-Frame-Options: DENY`: Impide que la aplicación sea embebida en un `<iframe>` externo (protección contra Clickjacking).
   * `X-Content-Type-Options: nosniff`: Previene que el navegador interprete archivos con tipos MIME incorrectos (MIME sniffing).
   * `Strict-Transport-Security (HSTS)`: Fuerza el tráfico a través de HTTPS cifrado en producción.
   * `Referrer-Policy: strict-origin-when-cross-origin`: Evita filtrar URLs internas con datos a sitios de terceros.

### C. Protección contra Fuerza Bruta (Rate Limiting)
* El endpoint de login cuenta con un limitador de frecuencia: si una dirección IP supera 5 intentos erróneos en menos de 60 segundos, las peticiones subsiguientes se bloquean con código **HTTP 429 (Too Many Requests)**.

---

## 3. Checklist de Configuración Segura en Producción

### 🔐 Variables de Entorno en Render (Backend):
Configurar en el panel de Render (`Environment Secrets`):
* `APP_ENV=production`
* `TEAM_USERNAME=<tu_usuario_privado>`
* `TEAM_PASSWORD_HASH=<generado_por_security/auth.py>`
* `TEAM_SHARED_SECRET=<clave_aleatoria_de_32_caracteres>`
* `CFBD_API_KEY=<token_privado_de_collegefootballdata>`

### 🌐 Variables de Entorno en Vercel (Frontend):
Configurar en el panel de Vercel (`Environment Variables`):
* `VITE_API_URL=https://gridiron-hub.onrender.com` (o la URL que te asigne Render).

---

## 4. Política de Cero Secretos en Repositorio Público (Security Cleanse)

Para garantizar que nadie en internet o en GitHub pueda vulnerar el sistema:
1. **Cero credenciales por defecto:** No existen usuarios ni contraseñas "default" en el código fuente.
2. **Fail-Closed:** Si las variables `TEAM_USERNAME` o `TEAM_PASSWORD_HASH` no están presentes en el entorno, el sistema deniega el acceso automáticamente.
3. **Cero claves estáticas de firma:** Los tokens de sesión se firman mediante claves criptográficas aleatorias en memoria si no se provee `TEAM_SHARED_SECRET`, impidiendo la falsificación de tokens.
4. **Formularios limpios:** La interfaz web no incluye credenciales prellenadas, pistas ni botones de demostración que expongan accesos.

---

## 5. Conclusión de la Auditoría
La arquitectura resultante para la **Opción 1** cuenta con aislamiento de red, protección contra filtración de secretos mediante Gitleaks, control de acceso privado para el equipo de YouTube y mitigaciones activas para los 10 riesgos críticos de OWASP.
