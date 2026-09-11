# SOP Maestro — Gridiron Hub 2.0

> **Versión:** 2.0.0  
> **Ámbito:** Plataforma interna de investigación, analítica avanzada (EPA / Win Probability) y producción de contenido de YouTube para NFL y NCAA.  
> **Stack:** Python 3.13 + FastAPI + SQLite (WAL) + Frontend Nativo Modular (DTCG Tokens) + Git/GitHub Actions.  
> **Costo Operativo:** $0 perpetuo (cero APIs de pago).  
> **Seguridad:** Aislamiento 100% de credenciales y secretos de GitHub e Internet.  

---

## 1. Principios Rectores y Metodologías Integradas

Gridiron Hub 2.0 adopta y sintetiza cuatro marcos de referencia esenciales de la ingeniería agéntica moderna:

### 1.1 Metodología Superpowers (`obra/superpowers`)
* **TDD Estricto (Red-Green-Refactor):** Ningún cálculo de métricas avanzadas (EPA ofensivo/defensivo, Win Probability swing, filtros de división) se introduce sin su respectiva prueba unitaria automatizada previa en `v2/tests/`.
* **Clarificación Socrática y Planificación Previa:** Todo cambio sustancial debe documentarse previamente mediante un ADR (*Architectural Decision Record*) en `v2/docs/decisions/` antes de su codificación.
* **Desacoplamiento Modular:** La arquitectura separa tajantemente ingesta, procesamiento, persistencia, servicio API y renderizado web. Ningún módulo depende de detalles internos de otro.

### 1.2 Estándares de Diseño y Usabilidad (`UX/UI Skills`)
* **Tokens DTCG (Design Tokens Community Group):** Definición formal de diseño en `v2/frontend/design-tokens/tokens.css`. El estilo no se quema en las vistas; se gobierna por variables globales.
* **Lookbook Aesthetic (Negro / Blanco / Rojo):**
  * **Fondo Base:** `#0B0B0C` (Negro azabache editorial profundo).
  * **Superficies y Tarjetas:** `#121214` a `#18181B`.
  * **Outlines Nítidos:** `1px solid #FFFFFF` o `rgba(255, 255, 255, 0.85)` para máxima definición en pantallas oscuras.
  * **Acentos de Impacto:** `#E5252A` (Rojo carmesí eléctrico) para badges de estado, métricas destacadas y tabs activas.
* **Accesibilidad WCAG 2.2 (Nivel AA/AAA):** Contraste superior a 7:1 en textos informativos, tamaño de objetivo táctil mínimo de 44×44 px y navegación compatible con teclado.

### 1.3 Especificaciones de Agentes (`skills.sh`)
* Los flujos repetitivos del agente y del equipo se empaquetan en especificaciones estándar `SKILL.md` bajo `v2/.agents/skills/`:
  * `ingest-nfl`: Procedimiento de sincronización y normalización de las 8 divisiones NFL y event IDs.
  * `ingest-ncaa`: Ingesta de conferencias FBS de NCAA y boxscores masivos.
  * `security-audit`: Escaneo automático de cero fugas de secretos y verificación de expiración de sesiones.
  * `ux-audit`: Verificación de contraste, rendimiento y adaptabilidad del drawer analítico.

### 1.4 Ecosistema Antigravity (`Antigravity Awesome Skills`)
* **Sandboxing Seguro:** Ningún comando escribe fuera del workspace autorizado.
* **Protección de Cuotas y Circuit Breakers:** Limitación programática estricta de consultas a endpoints de ESPN (máximo 30 sincronizaciones bajo demanda por sesión/día) para evitar baneos de IP o restricciones WAF.
* **Aislamiento Cero Fugas:** Ningún secreto, token o hash de contraseña se almacena en el control de versiones de Git.

---

## 2. Convenciones de Ramas y Flujo Git

Para garantizar el orden y aislar completamente la versión 1.0 de contingencia, se establece el siguiente árbol de ramas:

```text
main (Producción)
 │
 ├── develop (Versión 1.0 intacta como respaldo de contingencia)
 │
 └── develop-v2 (Línea principal de integración de Gridiron Hub 2.0)
      │
      ├── feature/v2-sop-framework      ← SOP 2.0, ADRs y especificaciones skills.sh
      ├── feature/v2-security-auth      ← Sistema multi-usuario PBKDF2 y aislamiento de secretos
      ├── feature/v2-nfl-engine         ← Mapeo de event_id ESPN, boxscores y divisiones NFL
      ├── feature/v2-frontend-lookbook  ← UI Lookbook negro/blanco/rojo y drawer analítico
      ├── feature/v2-storage-snapshot   ← SQLite v2, esquemas y snapshot auténtico 2026/2024
      └── feature/v2-tests              ← Suite de pruebas automatizadas TDD
```

### Reglas de Operación Git:
1. **Nunca hacer commit directo a `main` ni a `develop-v2`:** Todo desarrollo se efectúa en su rama `feature/v2-*`.
2. **Pull Requests y Revisión:** Cada feature branch se integra mediante Pull Request hacia `develop-v2`. Sam es el único facultado para fusionar a `develop-v2` y a `main`.
3. **Formato de Commits:**
   * `feat(v2-nfl): sincronización de boxscore en vivo por event_id`
   * `fix(v2-auth): eliminación de credenciales en duro y validación PBKDF2`
   * `style(v2-ui): tokens de diseño lookbook negro y acentos rojos`

---

## 3. Estructura de Directorios de la Versión 2.0

Toda la infraestructura y código de la nueva versión reside en `v2/`:

```text
gridiron-hub/
├── [v1 intacta en la raíz]              ← Respaldo de contingencia
│
└── v2/
    ├── SOP.md                          ← Este documento maestro
    ├── README.md                       ← Guía técnica y de despliegue
    ├── .env.example                    ← Variables de entorno de plantilla (sin datos reales)
    ├── .agents/skills/                 ← Habilidades estandarizadas de skills.sh
    │   ├── ingest-nfl/SKILL.md
    │   ├── ingest-ncaa/SKILL.md
    │   ├── security-audit/SKILL.md
    │   └── ux-audit/SKILL.md
    ├── docs/decisions/                 ← Registros de Decisiones de Arquitectura (ADRs)
    ├── security/                       ← Módulo de Autenticación y Criptografía
    │   ├── auth.py                     (PBKDF2, HMAC-SHA256 tokens)
    │   ├── manage_users.py             (CLI para gestión de cuentas de Sam y equipo)
    │   └── isolation.py                (Verificador de fuga de secretos)
    ├── storage/                        ← Persistencia de Datos
    │   ├── schema.sql                  (DDL SQLite v2 con índices)
    │   ├── db.py                       (Manejador de base de datos)
    │   └── v2_snapshot.json            (Datos auténticos sembrados)
    ├── ingestion/                      ← Tubería de Ingesta
    │   ├── assets_engine.py            (Directorio 32 NFL + 134 NCAA)
    │   ├── espn_client.py              (Scoreboard + Summary de ESPN)
    │   ├── nfl_engine.py               (Sincronización NFL y 8 divisiones)
    │   └── ncaa_engine.py              (Sincronización NCAA)
    ├── processing/                     ← Motores de Analítica
    │   ├── epa_calculator.py           (Cálculo de EPA por jugada)
    │   ├── wp_calculator.py            (Win Probability swing para Top 5)
    │   └── trivia_generator.py         (Trivia y contexto para YouTube)
    ├── api/                            ← Servicio REST FastAPI
    │   ├── main.py                     (App principal v2)
    │   └── routes/                     (auth, games, stats, awards)
    ├── frontend/                       ← Interfaz de Usuario
    │   ├── index.html                  (Estructura sin botón de autocompletado)
    │   ├── style.css                   (Estilos Lookbook: negro, outline blanco, rojo)
    │   ├── app.js                      (Controlador reactivo y drawer analítico)
    │   └── design-tokens/tokens.css    (Variables de color y tipografía)
    └── tests/                          ← Suite de Pruebas Automatizadas (pytest)
        ├── test_v2_auth.py
        ├── test_v2_nfl_ingestion.py
        ├── test_v2_filters.py
        └── test_v2_isolation.py
```

---

## 4. Política de Seguridad y Secreto Cero

1. **Cero Credenciales en Código o Repositorio:**
   * Queda estrictamente prohibido definir contraseñas o nombres de usuario por defecto en el código fuente.
   * La utilidad `fillTeamCredentials()` y cualquier botón de llenado rápido quedan desmantelados y prohibidos.
2. **Almacenamiento Local Aislado:**
   * Las cuentas de usuario creadas por Sam se almacenan en `v2/storage/auth.db` (base de datos local SQLite excluida explícitamente en `.gitignore`).
   * Las contraseñas se almacenan con PBKDF2-HMAC-SHA256 con 100,000 iteraciones y una sal criptográfica aleatoria de 16 bytes.
3. **Despliegue en Producción (Render / Vercel):**
   * En servidores remotos, las cuentas y firmas de sesión se inyectan a través de las variables de entorno privadas de la plataforma (`TEAM_SHARED_SECRET`, `GRIDIRON_USERS_JSON`).
4. **Verificación Automatizada con Gitleaks:**
   * En cada Pull Request y push, la acción `.github/workflows/gitleaks.yml` escanea el repositorio para bloquear cualquier detección de API keys, tokens o hashes commiteados accidentalmente.

---

## 5. Solución al Flujo de NFL y Ficha del Partido

1. **Mapeo Obligatorio de `event_id`:**
   * En la sincronización de ESPN Scoreboard, cada partido de NFL debe asociar su `event.id` de ESPN. Sin este identificador, no se permite el almacenamiento en el estado reactivo.
2. **Actualización Reactiva de la Ficha (Drawer):**
   * Al hacer clic en un partido de NFL, el sistema verifica si ya cuenta con `team_stats`. Si no los tiene y cuenta con `event_id`, invoca de inmediato el endpoint de resumen de ESPN (`site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event_id}`).
   * El resumen computa al vuelo:
     * Yardas totales, pase y carrera.
     * EPA acumulado y EPA desglosado (pase vs carrera).
     * Eficiencia en 3rd down y Red Zone.
     * Entregas de balón (turnovers).
     * Top 5 jugadas clave ordenadas por Win Probability swing.
   * Los datos se persisten en `localStorage` bajo la clave `gridiron_v2_summary_{game_id}` para garantizar navegación instantánea fuera de línea.
3. **Filtrado de las 8 Divisiones NFL:**
   * Los 32 equipos de NFL están asignados de forma inmutable a su conferencia (`AFC`, `NFC`) y su división oficial (`East`, `North`, `South`, `West`).
   * Los filtros de la barra superior ("AFC East", "AFC North", "NFC West", etc.) filtran de forma consistente tanto la cuadrícula de partidos como el selector de equipos.

---

## 6. Flujo Operativo Semanal del Equipo

1. **Jornada de Partidos (Jueves / Domingo / Lunes):**
   * Los marcadores se actualizan en vivo pulsando el botón "Actualizar datos" o mediante el job programado de GitHub Actions (`ingest_scheduler.yml`).
2. **Cierre de Jornada (Martes AM):**
   * Sam y su equipo inician sesión con sus cuentas personales.
   * Seleccionan la liga ("NFL" o "NCAA") y la semana correspondiente.
   * Filtran por división para analizar duelos clave.
   * Abren la ficha de cada partido para revisar el Boxscore de EPA, jugadas decisivas y trivias históricas generadas.
3. **Producción de YouTube:**
   * Navegan a la pestaña "Premios de la Semana" para revisar los candidatos automáticos a OPOW, DPOW y MVP.
   * Generan el guion con teleprompter interactivo para la grabación del video semanal.
