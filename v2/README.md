# Gridiron Hub 2.0 🏈

Plataforma analítica e investigativa avanzada para la producción de contenidos sobre NFL y NCAA.

## Novedades de la Versión 2.0
* **Aislamiento Total de Contingencia:** El código de la versión 1.0 se mantiene en la raíz para respaldo inmediato.
* **Lookbook Aesthetic:** Rediseño integral basado en estética editorial de moda y credenciales: fondo negro profundo (`#0B0B0C`), bordes blancos nítidos (`#FFFFFF`) y acentos en rojo carmesí (`#E5252A`).
* **Seguridad Zero-Leak:** Eliminación de usuarios por defecto y del botón de rellenado de credenciales. Soporte multi-usuario con sal y hash PBKDF2-HMAC-SHA256, sin exponer contraseñas ni llaves a GitHub.
* **Flujo NFL Completo y Estable:** Sincronización en vivo con mapeo de `event_id`, cálculo en tiempo real de EPA (pase, carrera, 3rd down, red zone), Top 5 jugadas por Win Probability swing y filtrado consistente de las 8 divisiones NFL.
* **Metodología Integrada:** Cumple con `obra/superpowers` (TDD, desacoplamiento, ADRs), directrices de `UX/UI skills`, especificaciones de `skills.sh` y sandboxing de `antigravity-awesome-skills`.

## Inicio Rápido (Local)

### 1. Requisitos Previos
* Python 3.11+
* Navegador moderno

### 2. Configuración de Usuarios de Equipo
Crea los usuarios autorizados de tu equipo de forma local y segura:
```bash
python3 v2/security/manage_users.py add-user sam
```
Se te solicitará la contraseña de forma oculta en la terminal y se guardará en `v2/storage/auth.db` (ignorado por Git).

### 3. Ejecutar la API FastAPI
```bash
python3 -m uvicorn v2.api.main:app --reload --port 8000
```

### 4. Abrir la Aplicación Frontend
Abre `v2/frontend/index.html` en tu navegador o sírvelo con:
```bash
python3 -m http.server 3000 --directory v2/frontend
```
Accede con tu usuario y contraseña creados en el paso 2.

## Ejecución de Pruebas Automatizadas
```bash
pytest v2/tests/ -v
```

