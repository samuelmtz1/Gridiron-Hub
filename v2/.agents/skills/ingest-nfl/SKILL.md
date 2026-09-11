---
name: ingest-nfl
description: Autonomous skill for ingesting NFL schedules, scoreboard triggers, boxscores, and EPA calculation for Gridiron Hub 2.0.
metadata:
  standard: skills.sh/v1
  framework: superpowers-obra
---

# Ingest NFL Skill (Gridiron Hub 2.0)

## Propósito
Ingestar los partidos de la NFL, asociar estrictamente el `event_id` de ESPN a cada juego, extraer estadísticas de boxscore (yardas de pase/carrera, entregas de balón, 3rd downs, red zone) y calcular el EPA acumulado y Top 5 jugadas clave por swing de probabilidad de victoria.

## Precondiciones
- Catálogo de 32 equipos NFL con conferencias (`AFC`, `NFC`) y 8 divisiones cargado desde `v2.ingestion.assets_engine`.
- Conexión a internet hacia `site.api.espn.com` o snapshot local en `v2/storage/v2_snapshot.json`.

## Procedimiento de Ejecución
1. Consultar el endpoint de Scoreboard de ESPN para NFL:
   `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={season}&week={week}&seasontype=2`
2. Para cada evento:
   - Extraer `event.id` y fijarlo como `game.event_id`.
   - Normalizar los códigos de equipo local y visitante.
   - Extraer marcadores, reloj y estado (`final`, `in_progress`, `scheduled`).
3. Si el juego está finalizado o en curso:
   - Consultar el resumen: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event_id}`.
   - Computar estadísticas analíticas por equipo mediante `v2.processing.epa_calculator`.
   - Filtrar las 5 jugadas con mayor variación en la probabilidad de victoria (`v2.processing.wp_calculator`).
4. Persistir los registros en la base de datos `v2/storage/gridiron_v2.db`.

