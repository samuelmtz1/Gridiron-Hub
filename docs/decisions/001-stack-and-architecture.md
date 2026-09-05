# ADR 001: Selección de Stack Tecnológico y Arquitectura $0

## Estado
Aceptado

## Contexto
El equipo de producción de contenido para YouTube requiere procesar datos semanales de NFL y NCAA para generar guiones, estadísticas avanzadas y seleccionar jugadas clave (premios, DOs & DON'Ts). El sistema debe operar con costo **$0 perpetuo**, sin suscripciones ni dependencias de pago, y con una arquitectura modular desacoplada.

## Decisión
1. **Fuentes de Datos:**
   - NFL: `nflreadpy` conectando con repositorios abiertos de `nflverse` (sin cuotas de pago).
   - NCAA: `cfbd` (CollegeFootballData) con tier gratuito de 1,000 llamadas/mes y caché local.
   - Triggers y Scores: API pública de ESPN Scoreboard (`site.api.espn.com`).
   - Assets gráficos: SVG y colores oficiales desde repositorios GitHub raw de `nflplotR` / `cfbplotR`.
2. **Almacenamiento:**
   - SQLite / DuckDB local para analítica columnar ultrarrápida sin infraestructura de pago en la nube.
3. **Backend:**
   - FastAPI (Python) por su velocidad asíncrona, tipado estricto con Pydantic y documentación OpenAPI automática.
4. **Frontend:**
   - React + Vite por ser liviano, rápido y desplegable sin costo en Vercel o GitHub Pages.
   - Enfoque de diseño "craft" (Emil Kowalski) y WCAG AA para máxima legibilidad sin distracciones visuales.
5. **Seguridad y Control de Código:**
   - Gitleaks en dos niveles (pre-commit y CI).
   - Git Flow estricto: `feature/*` -> `develop` -> `main` (merge manual exclusivo por el owner).

## Consecuencias
- El sistema es inmune a cobros inesperados.
- Cada conector de datos es reemplazable mediante adaptadores si alguna API cambia sus políticas.
- El rendimiento es local y autónomo.
