-- Schema SQLite para Gridiron Hub 2.0
-- Diseñado con soporte nativo para las 8 divisiones de NFL y conferencias de NCAA,
-- índices de alta velocidad, llaves foráneas y persistencia analítica (EPA, WP).

PRAGMA foreign_keys = ON;

-- 1. Catálogo Oficial de Equipos (32 NFL + 134 NCAA)
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,               -- e.g., 'nfl_KC', 'ncaa_ALA'
    league TEXT NOT NULL,              -- 'nfl' o 'ncaa'
    code TEXT NOT NULL,                -- e.g., 'KC', 'ALA'
    name TEXT NOT NULL,                -- e.g., 'Kansas City Chiefs'
    short_name TEXT NOT NULL,          -- e.g., 'Chiefs'
    city TEXT,                         -- e.g., 'Kansas City'
    conference TEXT NOT NULL,          -- e.g., 'AFC', 'SEC'
    division TEXT,                     -- e.g., 'West', 'East', 'North', 'South' (NFL)
    primary_color TEXT NOT NULL,       -- Hex, e.g., '#E31837'
    secondary_color TEXT NOT NULL,     -- Hex, e.g., '#FFB81C'
    logo_url TEXT NOT NULL,            -- URL de CDN ESPN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
CREATE INDEX IF NOT EXISTS idx_teams_conf_div ON teams(conference, division);

-- 2. Calendario y Partidos
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,               -- e.g., 'nfl_2026_01_kc_lac'
    league TEXT NOT NULL,              -- 'nfl' o 'ncaa'
    season INTEGER NOT NULL,           -- e.g., 2026
    season_type TEXT NOT NULL,         -- 'regular' o 'postseason'
    week INTEGER NOT NULL,             -- e.g., 1
    game_date TIMESTAMP NOT NULL,      -- UTC ISO string
    home_team_id TEXT NOT NULL REFERENCES teams(id),
    away_team_id TEXT NOT NULL REFERENCES teams(id),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status TEXT NOT NULL,              -- 'scheduled', 'in_progress', 'final'
    venue TEXT,
    weather_temp REAL,
    weather_desc TEXT,
    highlight_url TEXT,
    event_id TEXT,                     -- ESPN event ID para sincronización en vivo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_filter ON games(league, season, week);
CREATE INDEX IF NOT EXISTS idx_games_event_id ON games(event_id);

-- 3. Estadísticas de Equipo por Partido (Boxscore y Eficiencia EPA)
CREATE TABLE IF NOT EXISTS game_team_stats (
    id TEXT PRIMARY KEY,               -- e.g., 'stat_nfl_2026_01_kc'
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id),
    is_home BOOLEAN NOT NULL,
    total_yards INTEGER,
    passing_yards INTEGER,
    rushing_yards INTEGER,
    turnovers INTEGER,
    epa_total REAL,                    -- EPA agregado
    epa_pass REAL,                     -- EPA en pases
    epa_rush REAL,                     -- EPA en carreras
    third_down_comp INTEGER,
    third_down_att INTEGER,
    red_zone_comp INTEGER,
    red_zone_att INTEGER,
    time_of_possession TEXT            -- e.g., '32:15'
);

CREATE INDEX IF NOT EXISTS idx_team_stats_game ON game_team_stats(game_id);

-- 4. Top Jugadas Clave (Por EPA y Win Probability Swing)
CREATE TABLE IF NOT EXISTS key_plays (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    play_id TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    time_remaining TEXT NOT NULL,      -- e.g., '02:45'
    down INTEGER,
    ydstogo INTEGER,
    yardline TEXT,
    possession_team_id TEXT REFERENCES teams(id),
    play_type TEXT,                    -- 'pass', 'rush', 'interception', 'score'
    description TEXT NOT NULL,
    epa REAL,
    wp_before REAL,
    wp_after REAL,
    wp_swing REAL,                     -- Variación en Win Probability (|wp_after - wp_before|)
    is_turnover BOOLEAN DEFAULT 0,
    is_touchdown BOOLEAN DEFAULT 0,
    highlight_timestamp TEXT
);

CREATE INDEX IF NOT EXISTS idx_key_plays_game ON key_plays(game_id);

-- 5. Trivia y Narrativas para YouTube
CREATE TABLE IF NOT EXISTS game_trivia (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    category TEXT NOT NULL,            -- 'rivalry', 'milestone', 'stat_quirk', 'historical'
    fact_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trivia_game ON game_trivia(game_id);

-- 6. Candidatos a Premios Semanales (OPOW, DPOW, MVP, DOs & DON'Ts)
CREATE TABLE IF NOT EXISTS awards_candidates (
    id TEXT PRIMARY KEY,
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    league TEXT NOT NULL,
    category TEXT NOT NULL,            -- 'OPOW', 'DPOW', 'MVP', 'INT_WEEK', 'TD_WEEK', 'SPECIAL_TEAMS', 'DOS', 'DONTS'
    rank INTEGER NOT NULL,             -- 1 al 5
    candidate_name TEXT NOT NULL,
    candidate_type TEXT NOT NULL,      -- 'player' o 'play'
    team_id TEXT REFERENCES teams(id),
    stat_summary TEXT NOT NULL,
    highlight_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_awards_filter ON awards_candidates(season, week, league);

-- 7. Dossier Táctico
CREATE TABLE IF NOT EXISTS tactical_analysis (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    offensive_scheme TEXT,
    defensive_scheme TEXT,
    key_matchup TEXT,
    coach_tendency TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tactical_game ON tactical_analysis(game_id);

