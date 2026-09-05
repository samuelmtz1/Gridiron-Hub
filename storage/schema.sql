-- =====================================================================
-- Gridiron Hub Database Schema (SQLite / DuckDB compatible)
-- 100% Free, Local, High-Performance Analytics Storage
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Equipos (NFL y NCAA)
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,               -- e.g., 'nfl_KC', 'ncaa_ALA'
    league TEXT NOT NULL,              -- 'nfl' o 'ncaa'
    code TEXT NOT NULL,                -- 'KC', 'BUF', 'ALA', 'UGA'
    name TEXT NOT NULL,                -- 'Kansas City Chiefs', 'Alabama Crimson Tide'
    short_name TEXT NOT NULL,          -- 'Chiefs', 'Crimson Tide'
    city TEXT,                         -- 'Kansas City', 'Tuscaloosa'
    conference TEXT NOT NULL,          -- 'AFC', 'NFC', 'SEC', 'Big Ten', etc.
    division TEXT,                     -- 'West', 'East', 'North', 'South' (o NULL si NCAA no tiene)
    primary_color TEXT DEFAULT '#000000',   -- Hex color
    secondary_color TEXT DEFAULT '#FFFFFF', -- Hex color
    logo_url TEXT,                     -- Enlace directo al SVG en raw.githubusercontent.com
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_league_conf ON teams(league, conference, division);

-- Partidos
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,               -- e.g., 'nfl_2024_w10_buf_kc'
    league TEXT NOT NULL,              -- 'nfl' o 'ncaa'
    season INTEGER NOT NULL,           -- 2024
    season_type TEXT DEFAULT 'regular',-- 'regular', 'postseason'
    week INTEGER NOT NULL,             -- 1, 2, ... 18
    game_date TEXT NOT NULL,           -- ISO8601 YYYY-MM-DD
    home_team_id TEXT NOT NULL,
    away_team_id TEXT NOT NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',   -- 'scheduled', 'in_progress', 'final'
    venue TEXT,                        -- 'Arrowhead Stadium'
    weather_temp INTEGER,              -- Temperatura en Fahrenheit / Celsius
    weather_desc TEXT,                 -- 'Despejado', 'Lluvia leve', 'Domo'
    highlight_url TEXT,                -- Enlace a YouTube / ESPN highlights
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_games_league_season_week ON games(league, season, week);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Estadísticas avanzadas por partido (por equipo)
CREATE TABLE IF NOT EXISTS game_team_stats (
    id TEXT PRIMARY KEY,               -- e.g., 'stat_nfl_2024_w10_kc'
    game_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    is_home BOOLEAN NOT NULL,
    total_yards INTEGER DEFAULT 0,
    passing_yards INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    epa_total REAL DEFAULT 0.0,        -- EPA total acumulado
    epa_pass REAL DEFAULT 0.0,         -- EPA en pases
    epa_rush REAL DEFAULT 0.0,         -- EPA en carreras
    third_down_comp INTEGER DEFAULT 0,
    third_down_att INTEGER DEFAULT 0,
    red_zone_comp INTEGER DEFAULT 0,
    red_zone_att INTEGER DEFAULT 0,
    time_of_possession TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_game_team_stats ON game_team_stats(game_id, team_id);

-- Jugadas clave (Play-by-Play filtrado por alto impacto EPA / WP swing)
CREATE TABLE IF NOT EXISTS key_plays (
    id TEXT PRIMARY KEY,               -- e.g., 'play_2024_w10_kc_buf_142'
    game_id TEXT NOT NULL,
    play_id TEXT NOT NULL,             -- ID original del play-by-play
    quarter INTEGER NOT NULL,          -- 1, 2, 3, 4, 5 (OT)
    time_remaining TEXT NOT NULL,      -- '02:15'
    down INTEGER,                      -- 1, 2, 3, 4
    ydstogo INTEGER,                   -- Yardas para primero y diez
    yardline TEXT,                     -- 'KC 35'
    possession_team_id TEXT NOT NULL,
    play_type TEXT NOT NULL,           -- 'pass', 'run', 'field_goal', 'punt', 'interception', 'fumble'
    description TEXT NOT NULL,         -- Texto de la jugada
    epa REAL NOT NULL,                 -- Expected Points Added de la jugada
    wp_before REAL,                    -- Probabilidad de victoria previa (0.0 a 1.0)
    wp_after REAL,                     -- Probabilidad de victoria posterior (0.0 a 1.0)
    wp_swing REAL NOT NULL,            -- Cambio absoluto en WP (ej. 0.42 = 42%)
    is_turnover BOOLEAN DEFAULT 0,
    is_touchdown BOOLEAN DEFAULT 0,
    highlight_timestamp INTEGER,       -- Segundo referencial del video
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (possession_team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_key_plays_game ON key_plays(game_id);
CREATE INDEX IF NOT EXISTS idx_key_plays_wp_swing ON key_plays(wp_swing DESC);
CREATE INDEX IF NOT EXISTS idx_key_plays_epa ON key_plays(epa DESC);

-- Estadísticas individuales semanales para premios (OPOW, DPOW, MVP)
CREATE TABLE IF NOT EXISTS player_weekly_stats (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    league TEXT NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    position TEXT,                     -- 'QB', 'WR', 'DE', 'CB', etc.
    epa_total REAL DEFAULT 0.0,
    epa_pass REAL DEFAULT 0.0,
    epa_rush REAL DEFAULT 0.0,
    epa_defense REAL DEFAULT 0.0,
    pass_yards INTEGER DEFAULT 0,
    pass_td INTEGER DEFAULT 0,
    pass_int INTEGER DEFAULT 0,
    rush_yards INTEGER DEFAULT 0,
    rush_td INTEGER DEFAULT 0,
    rec_yards INTEGER DEFAULT 0,
    rec_td INTEGER DEFAULT 0,
    tackles INTEGER DEFAULT 0,
    sacks REAL DEFAULT 0.0,
    interceptions INTEGER DEFAULT 0,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_player_weekly ON player_weekly_stats(league, season, week);

-- Candidatos a premios semanales (Preselección de IA / Analytics)
CREATE TABLE IF NOT EXISTS awards_candidates (
    id TEXT PRIMARY KEY,
    league TEXT NOT NULL,              -- 'nfl' o 'ncaa'
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    category TEXT NOT NULL,            -- 'OPOW', 'DPOW', 'MVP', 'INT_OF_WEEK', 'TD_OF_WEEK', 'SPECIAL_TEAMS', 'DO', 'DONT'
    candidate_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    stat_summary TEXT NOT NULL,        -- '4 TD, 342 yds, +18.4 EPA'
    metric_value REAL NOT NULL,        -- EPA acumulado o WP swing
    clip_url TEXT,                     -- Link directo para el equipo de edición
    rank INTEGER NOT NULL,             -- 1, 2, 3 (terna)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_awards_lookup ON awards_candidates(league, season, week, category);

-- Trivia y contexto histórico
CREATE TABLE IF NOT EXISTS game_trivia (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    category TEXT DEFAULT 'record',    -- 'record', 'streak', 'milestone', 'historical'
    fact_text TEXT NOT NULL,           -- 'Patrick Mahomes supera a Tom Brady en victorias antes de los 30 años.'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trivia_game ON game_trivia(game_id);

