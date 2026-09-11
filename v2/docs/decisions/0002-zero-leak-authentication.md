# ADR 0002: Autenticación Multi-Usuario y Política de Secreto Cero

## Contexto
En la versión 1.0 existía un botón de autocompletado y credenciales predeterminadas en el código (`gridiron_team` / `Gridiron2026!`), lo que permitía acceso no controlado y constituía un riesgo de seguridad en GitHub.

## Decisión
1. Eliminar permanentemente la función `fillTeamCredentials()`, los botones de autocompletado y cualquier credencial hardcodeada.
2. Implementar un módulo de gestión de usuarios con PBKDF2-HMAC-SHA256 (100,000 iteraciones + sal de 16 bytes).
3. Proveer una herramienta CLI (`v2/security/manage_users.py`) que almacena las cuentas en una base de datos local `v2/storage/auth.db` (ignorada por Git) o genera configuraciones para variables de entorno en producción.
4. Usar tokens de sesión HMAC-SHA256 con verificación en tiempo constante.

## Consecuencias
- **Positivas:** Seguridad de nivel industrial. Ninguna contraseña o hash se expone a GitHub o al público.
- **Compromisos:** El administrador (Sam) debe inicializar al menos una cuenta de usuario para poder acceder al sistema.

