---
name: ingest-ncaa
description: Autonomous skill for ingesting NCAA FBS schedules, conference metadata, and game summaries for Gridiron Hub 2.0.
metadata:
  standard: skills.sh/v1
  framework: superpowers-obra
---

# Ingest NCAA Skill (Gridiron Hub 2.0)

## Propósito
Sincronizar partidos de NCAA Football Bowl Subdivision (FBS), agrupando los equipos por sus conferencias oficiales (SEC, Big Ten, Big 12, ACC, American, Mountain West, Sun Belt, MAC, C-USA, Pac-12), manteniendo las métricas avanzadas y premios de los jugadores.

## Precondiciones
- Catálogo de 134 equipos NCAA en `v2.ingestion.assets_engine`.
- Soporte para grupos FBS (`groups=80` en ESPN).

## Procedimiento
1. Realizar solicitud al Scoreboard de NCAA:
   `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates={season}&week={week}&seasontype=2&groups=80&limit=100`
2. Enlazar `event.id` a cada partido.
3. Almacenar equipos y conferencias validadas.
4. Generar candidatos a premios semanales (Heisman Watch, OPOW, DPOW).
