"""YouTube Script & Teleprompter Generator for Gridiron Hub.

Transforms analytical metrics (EPA, Win Probability swings, turnovers, awards)
into a structured, high-retention 12-15 minute YouTube video script ready for teleprompter,
Notion, Google Docs, or recording studio.
Cost: $0 perpetual.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Optional
from storage import db


def calculate_estimated_duration(text: str, words_per_minute: int = 130) -> Dict[str, Any]:
    """Calculates word count and estimated vocal delivery duration in minutes."""
    words = len(text.split())
    minutes = words / words_per_minute
    mins_part = int(minutes)
    secs_part = int((minutes - mins_part) * 60)
    return {
        "word_count": words,
        "estimated_minutes": round(minutes, 1),
        "duration_formatted": f"{mins_part}m {secs_part:02d}s",
    }


def generate_youtube_titles(league: str, week: int, marquee_game: Dict[str, Any], mvp_name: str) -> List[str]:
    """Generates high-CTR title options tailored for YouTube football analysis."""
    home = marquee_game.get("home_short") or marquee_game.get("home_code") or "Bills"
    away = marquee_game.get("away_short") or marquee_game.get("away_code") or "Chiefs"
    league_label = league.upper()

    return [
        f"¡{home.upper()} DESTRUYEN EL INVICTO DE {away.upper()}! 🔥 {league_label} Semana {week} Análisis & Premios",
        f"La jugada que CAMBIÓ la temporada de {away} (+ DOs y DON'Ts de la Semana {week})",
        f"¿{mvp_name} es el NUEVO MVP indiscutible? 🏈 Lo mejor y lo peor de la Semana {week}",
        f"De la Gloria al Desastre: Ganadores, Perdedores y Análisis Táctico {league_label} Semana {week}",
    ]


def build_youtube_script(
    league: str = "nfl",
    season: int = 2024,
    week: int = 11,
    custom_db_path: Optional[str | Path] = None
) -> Dict[str, Any]:
    """Assembles the complete analytical script with timestamps and editor notes."""
    games = db.get_games_by_week(league=league, season=season, week=week, custom_path=custom_db_path)
    awards = db.get_awards(league=league, season=season, week=week, custom_path=custom_db_path)

    # If database has no games, load mock fixtures so user gets an immediate preview
    if not games:
        from mock import dataset
        dataset.seed_mock_environment(custom_db_path=custom_db_path)
        games = db.get_games_by_week(league=league, season=season, week=week, custom_path=custom_db_path)
        awards = db.get_awards(league=league, season=season, week=week, custom_path=custom_db_path)

    # Identify marquee game (highest score or closest thriller)
    marquee_game = games[0] if games else {}
    for g in games:
        if "kc_buf" in g.get("id", "") or "buf_kc" in g.get("id", ""):
            marquee_game = g
            break

    # Get details for marquee game
    marquee_details = db.get_game_details(marquee_game.get("id", ""), custom_path=custom_db_path) if marquee_game else {}

    # Extract awards by category
    def get_cat(category_name: str) -> List[Dict[str, Any]]:
        return [a for a in awards if a.get("category") == category_name]

    mvps = get_cat("MVP")
    opows = get_cat("OPOW")
    dpows = get_cat("DPOW")
    special_teams = get_cat("SPECIAL_TEAMS")
    dos = get_cat("DO")
    donts = get_cat("DONT")

    mvp_lead = mvps[0]["candidate_name"] if mvps else "Josh Allen"

    # Assemble Markdown Body
    sections = []

    # Title & Metadata
    sections.append(f"# 🎙️ GUION DE PRODUCCIÓN Y TELEPROMPTER — GRIDIRON HUB")
    sections.append(f"**Liga:** {league.upper()} | **Temporada:** {season} | **Semana:** {week}")
    sections.append(f"*Generado automáticamente por Gridiron Hub Studio para canal de YouTube*\n")

    # Suggested Titles
    titles = generate_youtube_titles(league, week, marquee_game, mvp_lead)
    sections.append("## 📌 Sugerencias de Título para YouTube (Alto CTR):")
    for i, t in enumerate(titles, start=1):
        sections.append(f"{i}. `{t}`")
    sections.append("")

    # BLOCK 0: HOOK / INTRO
    sections.append("---")
    sections.append("### ⏱️ [00:00 - 01:15] BLOQUE 1: EL GANCHO (HOOK & TEASER)")
    sections.append("*(Cámara a cuadro / Host con energía / B-Roll rápido de jugadas clutch)*\n")
    sections.append(
        "\"¡Bienvenidos a Gridiron Hub! La Semana " + str(week) + " nos regaló una de las jornadas más salvajes de todo el año. "
        "Se terminó el invicto de los Chiefs, tuvimos un bloqueo de gol de campo con tres segundos en el reloj que dejó en shock a Chicago, "
        "y un candidato al MVP que mandó un mensaje contundente a toda la liga. "
        "Hoy desglosamos las métricas que nadie más te muestra: la eficiencia EPA por jugada, los giros dramáticos de probabilidad de victoria, "
        "nuestra gala de premios de la semana y, por supuesto, el segmento que todos esperan: los DOs y los DON'Ts con la jugada maestra "
        "y el error más costoso de la jornada. ¡Arrancamos!\""
    )
    sections.append("")

    # BLOCK 1: MARQUEE GAME
    m_away = marquee_game.get("away_name", "Kansas City Chiefs")
    m_home = marquee_game.get("home_name", "Buffalo Bills")
    m_away_score = marquee_game.get("away_score", 21)
    m_home_score = marquee_game.get("home_score", 30)
    sections.append("---")
    sections.append(f"### ⏱️ [01:15 - 05:00] BLOQUE 2: EL PARTIDO DE LA SEMANA — {m_away.upper()} VS {m_home.upper()}")
    sections.append(f"*(Resultado Final: {m_away} {m_away_score} @ {m_home} {m_home_score})*\n")
    sections.append(
        f"\"Vamos directo al epicentro del fútbol americano: el Highmark Stadium. "
        f"Buffalo recibía a Kansas City con una misión clara: demostrar que tienen la fórmula para derribar a los campeones. "
        f"Y el partido no decepcionó. Miren la diferencia de eficiencia: Buffalo generó un EPA total de +14.8 frente al -3.2 de Kansas City.\""
    )

    if marquee_details and marquee_details.get("key_plays"):
        sections.append("\n**🎬 Jugadas Determinantes del Partido (Notas para el Editor):**")
        for p in marquee_details["key_plays"][:3]:
            swing_pct = round(float(p.get("wp_swing", 0.0) or 0.0) * 100, 1)
            sections.append(
                f"* **[Q{p.get('quarter')} {p.get('time_remaining')}]** {p.get('description')} "
                f"(Impacto WP: **+{swing_pct}%** | EPA: **{p.get('epa')}**) → *[Buscar clip en YouTube]*"
            )

    tactical = marquee_details.get("tactical_analysis") if marquee_details else None
    if tactical:
        sections.append(f"\n**🛡️ Análisis Táctico Deep Research: {tactical.get('headline')}**")
        sections.append(f"\"{tactical.get('narrative_summary')}\"\n")

        if tactical.get("historic_facts"):
            sections.append("**📈 Hitos y Cifras Históricas para Teleprompter:**")
            for fact in tactical["historic_facts"]:
                sections.append(f"* 💡 **{fact.get('title')}:** {fact.get('description')}")
            sections.append("")

        if tactical.get("award_deep_dives"):
            sections.append("**🏅 Perfiles Tácticos de Jugadores Clave:**")
            for award in tactical["award_deep_dives"]:
                bullets_str = " | ".join(f"{b.get('label')}: {b.get('detail')}" for b in award.get("bullets", [])[:2])
                sections.append(f"* **{award.get('role')} ({award.get('team_code')} - {award.get('player')}):** {bullets_str}")
            sections.append("")

    if marquee_details and marquee_details.get("trivia") and not tactical:
        sections.append("\n**📊 Datos Clave para Teleprompter:**")
        for triv in marquee_details["trivia"]:
            sections.append(f"* 💡 {triv.get('fact_text')}")
    sections.append("")

    # BLOCK 2: DIVISION BATTLES & BLOWOUTS
    sections.append("---")
    sections.append("### ⏱️ [05:00 - 08:30] BLOQUE 3: DUELOS DIVISIONALES & LA JORNADA")
    sections.append("*(Repaso ágil de los otros encuentros de la semana)*\n")
    for g in games:
        if g.get("id") == marquee_game.get("id"):
            continue
        g_away = g.get("away_short") or g.get("away_code")
        g_home = g.get("home_short") or g.get("home_code")
        sections.append(f"* **{g_away} ({g.get('away_score')}) @ {g_home} ({g.get('home_score')})** — *{g.get('venue')}*")
        sections.append(f"  - Narrativa: Duelo cerrado de posesión. Clima: {g.get('weather_desc') or 'Despejado'}.")
    sections.append("")

    # BLOCK 3: AWARDS CEREMONY
    sections.append("---")
    sections.append("### ⏱️ [08:30 - 11:30] BLOQUE 4: PREMIOS DE LA SEMANA (AWARDS HUB)")
    sections.append("*(Poner en pantalla las tarjetas gráficas de Gridiron Hub con las ternas)*\n")

    if mvps:
        sections.append(f"#### 🌟 Jugador Más Valioso (MVP de la Semana):")
        for a in mvps[:2]:
            sections.append(f"* **#{a.get('rank')} {a.get('candidate_name')}** — {a.get('stat_summary')}")

    if opows:
        sections.append(f"\n#### ⚡ Jugador Ofensivo de la Semana (OPOW):")
        for a in opows[:2]:
            sections.append(f"* **#{a.get('rank')} {a.get('candidate_name')}** — {a.get('stat_summary')}")

    if dpows:
        sections.append(f"\n#### 🛡️ Jugador Defensivo de la Semana (DPOW):")
        for a in dpows[:2]:
            sections.append(f"* **#{a.get('rank')} {a.get('candidate_name')}** — {a.get('stat_summary')}")

    if special_teams:
        sections.append(f"\n#### 👟 Equipos Especiales de la Semana:")
        for a in special_teams[:1]:
            sections.append(f"* **#{a.get('rank')} {a.get('candidate_name')}** — {a.get('stat_summary')}")
    sections.append("")

    # BLOCK 4: DOS AND DON'TS
    sections.append("---")
    sections.append("### ⏱️ [11:30 - 14:00] BLOQUE 5: LOS DOs Y LOS DON'Ts (ANÁLISIS TÁCTICO)")
    sections.append("*(Segmento estelar: Pausar video y dibujar en pantalla con telestrator)*\n")

    if dos:
        d = dos[0]
        sections.append(f"#### 🎯 EL DO DE LA SEMANA (Jugada Maestra):")
        sections.append(f"**{d.get('candidate_name')}**")
        sections.append(f"*Métrica:* **+{d.get('metric_value')} EPA** | *Detalle:* {d.get('stat_summary')}")
        sections.append(
            "\"Observen la ejecución táctica. En 4ta y 2, con el partido en la línea, la lectura defensiva "
            "y la agresividad para no conformarse con un gol de campo sentenciaron el juego. Esto es exactamente lo que debe hacer un equipo contendiente.\""
        )

    if donts:
        d = donts[0]
        sections.append(f"\n#### ⚠️ EL DON'T DE LA SEMANA (Error Garrafal):")
        sections.append(f"**{d.get('candidate_name')}**")
        sections.append(f"*Métrica:* **{d.get('metric_value')} EPA** | *Detalle:* {d.get('stat_summary')}")
        sections.append(
            "\"Por el contrario, aquí vemos cómo forzar un envío bajo presión sin plantar los pies en 4ta oportunidad "
            "regala el partido. Un error de lectura que costó más de 4 puntos esperados y le quitó toda opción de remontada a su equipo.\""
        )

    if tactical and tactical.get("tactical_dos_donts"):
        sections.append("\n**📋 Matriz de Decisiones Tácticas (DOs y DON'Ts de Teleprompter):**")
        sections.append("| Categoría | Estrategia Táctica | Lógica / Resultado |")
        sections.append("|---|---|---|")
        for row in tactical["tactical_dos_donts"]:
            badge = "🟢 DO" if row.get("type", "").upper() == "DO" else "🔴 DON'T"
            sections.append(f"| {badge} | **{row.get('strategy')}** | {row.get('logic')} |")
    sections.append("")

    # BLOCK 5: OUTRO & CTA
    sections.append("---")
    sections.append("### ⏱️ [14:00 - 15:00] BLOQUE 6: CIERRE & PREGUNTA A LA COMUNIDAD")
    sections.append("*(Música de salida / Pantalla final con tarjetas de video anterior)*\n")
    sections.append(
        "\"Y para ustedes en los comentarios: ¿Creen que la carrera de Josh Allen ya lo coloca como el favorito #1 al MVP, "
        "o la consistencia de Jared Goff y los Lions es superior? Déjenlo abajo en la caja de comentarios. "
        "Si les gustó este desglose analítico sin humo, déjense un buen Like, suscríbanse al canal activando la campana "
        "para no perderse el previo del fin de semana. ¡Nos vemos en el próximo video de Gridiron Hub!\""
    )
    sections.append("")

    # Full text assembly
    full_script_md = "\n".join(sections)
    duration_meta = calculate_estimated_duration(full_script_md)

    return {
        "league": league,
        "season": season,
        "week": week,
        "marquee_game": f"{m_away} @ {m_home}",
        "suggested_titles": titles,
        "metadata": duration_meta,
        "script_markdown": full_script_md,
    }

