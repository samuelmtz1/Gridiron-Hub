# SOP + Master Prompt — "Gridiron Hub"

Plataforma interna de research y producción de contenido NFL/NCAA para tu canal de YouTube  
**Stack objetivo:** Python + VS Code + Antigravity + GitHub · **Costo:** $0 perpetuo · **Owner del merge final:** Sam y Equipo  

---

## 0. Cómo usar este documento

Este archivo tiene dos partes:
1. **Parte A — SOP de arquitectura:** cómo se organiza el proyecto, el repo, las ramas, la seguridad y el flujo de trabajo semanal de tu equipo.
2. **Parte B — Master Prompt:** un bloque de texto listo para pegar directamente en Antigravity (dentro de VS Code) para que el agente arranque la construcción siguiendo exactamente estas reglas.

Guarda este archivo como `SOP.md` en la raíz del repo. Es la fuente de verdad; cualquier cambio de arquitectura se edita aquí primero, no en el código.

---

## PARTE A — Arquitectura y SOP

### A.1 Principio rector
El "bottleneck" (buscar manualmente stats, highlights y datos de cada juego después de la jornada) se resuelve con una tubería de ingesta programática que corre sola apenas terminan los partidos, y un hub de consulta donde tu equipo navega la información ya organizada — ustedes dejan de buscar y pasan a elegir y narrar, que es el trabajo creativo real.

### A.2 Fuentes de datos (100% gratis, sin llaves de pago)
Basado en la investigación, así se reparte cada fuente:

| Fuente | Uso | Notas de gratuidad |
| :--- | :--- | :--- |
| **nflreadpy** (ecosistema nflverse) | Stats NFL, play-by-play, EPA/CPOE, Next Gen Stats, draft | Repos públicos GitHub, sin límite de llamadas, cachear localmente con `NFLREADPY_CACHE=filesystem` |
| **cfbd / cfb-data** (CollegeFootballData) | Stats NCAA, ratings SP+/Elo, reclutamiento, líneas de apuestas | Gratis hasta 1,000 llamadas/mes con token Bearer — mitigar con caché SQLite local |
| **ESPN Scoreboard JSON** (`site.api.espn.com`) | Trigger de "juego terminado", scores en vivo | Endpoint público no documentado, sin key — úsalo como disparador, no como fuente única (puede cambiar sin aviso) |
| **TheSportsDB** (API pública `/123/`) | Metadatos: fundación, estadios, escudos, bios | Gratis con ID de prueba público |
| **API-Football / API-NFL** (fallback) | Verificación cruzada de estado del juego | 100 llamadas/día gratis — úsalo solo como respaldo terciario |
| **nflplotR / cfbplotR** (repos GitHub) | Logos SVG, colores hex oficiales de cada equipo | Descarga directa desde GitHub raw, licencias MIT/CC-BY |
| **edge-tts / Piper TTS** | Narración sintética opcional para guiones o clips internos de preview | 100% local u open, sin costo |
| **MoviePy** | Recorte y ensamblaje de highlights si ustedes suben metraje propio | Solo Python, sin dependencias de pago |

**Regla de oro:** ninguna fuente pagada entra al proyecto. Si en el futuro alguna API gratuita cambia sus términos, el sistema debe poder desconectar esa fuente sin romper el resto (ver A.4, arquitectura modular).

### A.3 Qué es el "Hub"
Es un sitio web (puede correr localmente o desplegarse gratis en GitHub Pages / Render / Vercel free tier) con esta jerarquía de navegación:
```
Liga (NFL / NCAA)
 └─ División o Conferencia (AFC East, SEC, Big Ten, etc.)
     └─ Equipo
         └─ Juego de la semana
             ├─ Ficha del partido (fecha, sede, clima si aplica, resultado)
             ├─ Game stats (EPA, yardas, eficiencia, red zone, terceras conv.)
             ├─ Jugadas clave (top plays por EPA/win probability swing)
             ├─ Trivia generada (récords, rachas, contexto histórico)
             ├─ Links a highlights (YouTube/ESPN, no hosting de video propio)
             └─ Candidatos a premios (ver A.6)
```
Cada nivel es un filtro, no una página nueva de código — la UI es una sola app con vistas anidadas (ver A.5, frontend).

### A.4 Arquitectura modular del repo
Estructura pensada para que cada pieza sea sustituible sin tocar las demás, y para que cada una viva en su propia rama:

```text
gridiron-hub/
├── SOP.md                      ← este documento
├── .env.example                ← nunca el .env real
├── .gitignore
├── .gitleaks.toml              ← reglas de escaneo de secretos
├── .github/workflows/
│   ├── gitleaks.yml            ← escaneo de secretos en cada push/PR
│   ├── ingest_scheduler.yml    ← corre el scraping tras el último juego de la jornada
│   └── tests.yml
├── ingestion/                  ← rama: feature/ingestion
│   ├── nfl_source.py           (wrapper de nflreadpy)
│   ├── cfb_source.py           (wrapper de cfbd/cfb-data)
│   ├── live_trigger.py         (poll a ESPN scoreboard)
│   ├── metadata_source.py      (TheSportsDB)
│   └── assets_source.py        (logos/colores de nflplotR/cfbplotR)
├── processing/                 ← rama: feature/processing
│   ├── trivia_engine.py        (genera datos narrativos por juego)
│   ├── awards_engine.py        (candidatos DPOW/OPOW/etc., ver A.6)
│   └── highlight_selector.py   (jugadas top por EPA/WP swing)
├── storage/                    ← rama: feature/storage
│   ├── schema.sql              (SQLite/DuckDB)
│   └── db.py
├── api/                        ← rama: feature/api
│   └── main.py                 (FastAPI, sirve el JSON al frontend)
├── frontend/                   ← rama: feature/frontend
│   ├── src/
│   └── design-tokens/          (brand kit, ver A.7)
├── security/                   ← rama: feature/security
│   └── README.md               (ver A.8)
├── mock/                       ← rama: feature/mock-preview (entorno de Staging Mock Preview)
│   ├── dataset.py              (datos sintéticos realistas NFL y NCAA)
│   └── preview_runner.py       (servidor y visualizador de pruebas)
└── docs/
    └── decisions/              (ADRs — por qué se eligió cada herramienta)
```

**Flujo de ramas:**
* `main` = producción, solo tú haces merge.
* `develop` = integración semanal.
* `feature/<módulo>` = una rama por carpeta de arriba. Tu equipo (o el agente en Antigravity) trabaja ahí.
* Cada módulo se abre como Pull Request individual hacia `develop`. Tú revisas y mergeas manualmente — nada se autofusiona a `main`.
* Convención de commits: `ingestion: agrega wrapper de load_pbp()`, `frontend: vista de conferencia`, etc., para que el historial documente el proyecto por sí solo.

### A.5 Frontend: profesional, sin ruido
* **Framework:** React + Vite (ligero, gratis, se despliega gratis en GitHub Pages/Vercel).
* **Principios de diseño:**
  * Jerarquía tipográfica clara antes que color; el dato es el protagonista.
  * Transiciones solo donde ayudan a entender un cambio de estado (ej. abrir un juego), nunca decorativas.
  * Contraste y tamaños de fuente que cumplan accesibilidad AA (WCAG) — tu equipo va a leer esto bajo presión de tiempo, no puede fatigar la vista.
  * Un solo layout de "tabla/tarjeta densa de datos" reutilizado en todos los niveles (liga → conferencia → equipo → juego), en vez de una pantalla distinta por nivel.
* **Brand kit:** una carpeta `frontend/design-tokens/` con paleta del canal, tipografía, y los colores oficiales de cada equipo (extraídos de `nflplotR/cfbplotR`) como variables CSS, para que cualquier rediseño futuro sea cambiar tokens, no reescribir componentes.

### A.6 Automatizando la selección de premios semanales
El sistema no reemplaza la decisión de tu equipo, pero les llega con una preselección basada en datos para cada categoría:

| Premio | Métrica base sugerida | Fuente |
| :--- | :--- | :--- |
| **OPOW / DPOW** | Mayor EPA ofensivo/defensivo agregado del jugador en la semana | `load_player_stats()` |
| **Intercepción de la semana** | Mayor swing de Win Probability generado por una intercepción | `load_pbp()` (columna WP) |
| **TD de la semana** | Mayor yardas o mayor swing de WP en la jugada de TD | `load_pbp()` |
| **Special Teams de la semana** | Mayor impacto en field position / EPA en jugadas de ST | `load_pbp()` filtrado por jugada |
| **MVP de la semana** | Mayor EPA total combinando todas las categorías | `load_player_stats()` + `load_pbp()` |
| **DOs y DON'Ts** | Jugadas con mayor y menor EPA de la jornada, agrupadas | `load_pbp()` |

El hub muestra un ranking de 3–5 candidatos por categoría con el clip/link de highlight ya enlazado.

### A.7 Seguridad desde el día uno
1. **Gitleaks en dos capas:**
   * Pre-commit hook local (`gitleaks protect --staged`) para que ningún token se commitee siquiera localmente.
   * GitHub Action (`.github/workflows/gitleaks.yml`) que bloquea el PR si detecta un secreto.
2. Nunca tokens de CFBD/API-Football en el código. Todo vive en `.env` (ignorado por git) o en GitHub Actions Secrets.
3. Least privilege en GitHub: solo tú con permisos de admin/merge a `main`; tu equipo con permisos de escritura solo en ramas `feature/*`.
4. Dependabot (gratis en GitHub) activado para alertas de dependencias vulnerables.
5. Rate limiting propio en `ingestion/` para no exceder las cuotas gratuitas de CFBD/API-Football y evitar bloqueos de IP.
6. Autenticación básica en `api/main.py` mediante token compartido de equipo (`X-Team-Token`).

### A.8 Flujo operativo semanal (el SOP real de tu equipo)
1. **Domingo/sábado noche:** apenas termina el último juego, el workflow programado (`ingest_scheduler.yml`) dispara la ingesta completa (`nflreadpy` + `cfbd` + TheSportsDB + logos).
2. **Lunes AM:** el hub ya está poblado. Tu equipo entra directo a la vista de "Semana X" con juegos, stats y candidatos a premios listos.
3. **Reunión de equipo:** navegan por conferencia/división, seleccionan partidos, jugadas y premios usando el hub como única fuente.
4. **Post-reunión:** cualquier ajuste de datos o diseño que quieran para la próxima semana se pide como tarea a Antigravity, se desarrolla en su `feature/*` correspondiente, y tú haces el merge cuando lo apruebes.

---

## PARTE B — Master Prompt para Antigravity (VS Code)

```text
Eres mi copiloto de desarrollo dentro de Antigravity (VS Code), trabajando en un
proyecto llamado "Gridiron Hub": una plataforma interna en Python + React para
mi equipo de producción de contenido de YouTube sobre NFL y NCAA.

ANTES DE ESCRIBIR CÓDIGO, lee /SOP.md completo — es la fuente de verdad de
arquitectura, ramas y seguridad de este proyecto. Todo lo que construyas debe
seguir exactamente esa estructura de carpetas y ese flujo de ramas.

REGLAS NO NEGOCIABLES:
1. Cero dependencias o servicios de pago. Si dudas de si algo es gratis para
siempre, dilo explícitamente y propone la alternativa gratuita.
2. Cada módulo (ingestion, processing, storage, api, frontend, security) vive
en su propia rama feature/<módulo> y se entrega como Pull Request separado
hacia develop. Nunca hagas merge a main tú mismo — eso lo hago yo
manualmente después de revisar.
3. Ningún secreto, token o API key se escribe jamás directamente en el código.
Todo va en variables de entorno documentadas en .env.example.
4. La arquitectura debe permitir reemplazar cualquier fuente de datos (por
ejemplo, si CollegeFootballData cambia sus términos) sin tocar el resto del
sistema — usa interfaces/wrappers, no llamadas directas dispersas por el
código.
5. UI: profesional, legible, accesible (WCAG AA), sin animaciones o
transiciones que no comuniquen algo funcional. Sigue el criterio de calidad
de emil-design-eng para cualquier decisión de interfaz.
6. Antes de cada tarea grande, dame un plan corto en texto (qué vas a hacer,
en qué rama, qué archivos tocarás) y espera mi confirmación antes de
generar código extenso.
```
