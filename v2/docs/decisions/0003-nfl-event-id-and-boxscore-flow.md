# ADR 0003: Mapeo Obligatorio de Event ID de ESPN y Flujo de Boxscore en Ficha NFL

## Contexto
En la versión 1.0, el botón "Actualizar datos" actualizaba los marcadores de los juegos de NFL en la pantalla principal pero no guardaba el `event.id` de ESPN en el objeto del juego. Al abrir la ficha (drawer), el frontend no podía consultar el resumen ni el boxscore, dejando las tablas en blanco o con guiones. Adicionalmente, el filtrado divisional de NFL estaba roto debido a comparaciones incompletas y sobrescritura de conferencias.

## Decisión
1. Guardar obligatoriamente el `event.id` de ESPN como `game.event_id` en cada partido sincronizado.
2. Descargar y procesar el boxscore y las 5 jugadas clave al vuelo para partidos concluidos o en vivo, calculando EPA (pase, carrera, 3rd down, red zone).
3. Cachear localmente los resúmenes en `localStorage` (`gridiron_v2_summary_{game_id}`) para consulta instantánea fuera de línea.
4. Definir las 8 divisiones oficiales de la NFL y vincularlas de forma inmutable a los 32 equipos.

## Consecuencias
- **Positivas:** La ficha de cada partido de NFL se llena de forma instantánea y reactiva con datos verificados. El filtrado de las 8 divisiones opera sin inconsistencias.
