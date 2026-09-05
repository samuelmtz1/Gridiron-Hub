/**
 * Gridiron Hub - Frontend Reactive Controller
 * Connects to FastAPI Backend or operates in 100% Offline Mock Staging Mode.
 */

// Global State
const state = {
  league: "nfl",
  season: 2024,
  week: 11,
  view: "games",
  divisionFilter: "ALL",
  games: [],
  awards: [],
  selectedGame: null,
  authToken: sessionStorage.getItem("gridiron_token") || null,
  currentUser: sessionStorage.getItem("gridiron_user") || null,
};

// Authentication & API Helpers
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? ""
  : (window.GRIDIRON_API_URL || localStorage.getItem("gridiron_api_url") || "");

function getAuthHeaders() {
  const headers = {};
  if (state.authToken) {
    headers["Authorization"] = `Bearer ${state.authToken}`;
  }
  return headers;
}

function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  return fetch(url, { ...options, headers });
}

function openLoginModal() {
  const overlay = document.getElementById("login-overlay");
  const errorBox = document.getElementById("login-error");
  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }
  if (overlay) overlay.classList.add("active");
}

function closeLoginModal() {
  const overlay = document.getElementById("login-overlay");
  if (overlay) overlay.classList.remove("active");
}

function updateAuthUI() {
  const userBadge = document.getElementById("auth-user-badge");
  const logoutBtn = document.getElementById("btn-logout");
  const loginTrigger = document.getElementById("btn-login-trigger");

  if (state.authToken && state.currentUser) {
    if (userBadge) {
      userBadge.textContent = `👤 ${state.currentUser}`;
      userBadge.style.display = "inline-block";
    }
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (loginTrigger) loginTrigger.style.display = "none";
    closeLoginModal();
  } else {
    if (userBadge) userBadge.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (loginTrigger) loginTrigger.style.display = "inline-block";
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  const errorBox = document.getElementById("login-error");
  const submitBtn = document.getElementById("btn-submit-login");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!username || !password) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando credenciales...";
  }
  if (errorBox) {
    errorBox.style.display = "none";
  }

  try {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      state.authToken = data.token;
      state.currentUser = data.username;
      sessionStorage.setItem("gridiron_token", data.token);
      sessionStorage.setItem("gridiron_user", data.username);
      updateAuthUI();
      // Refresh current dataset with authorized session
      await initApp();
      if (state.view === "script") {
        await loadYoutubeScript();
      }
    } else {
      const err = await res.json().catch(() => ({}));
      if (errorBox) {
        errorBox.textContent = err.detail || "Error de inicio de sesión. Verifique sus credenciales.";
        errorBox.style.display = "block";
      }
    }
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = "Error al conectar con el servidor de autenticación.";
      errorBox.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Iniciar Sesión Segura";
    }
  }
}

function logoutUser() {
  state.authToken = null;
  state.currentUser = null;
  sessionStorage.removeItem("gridiron_token");
  sessionStorage.removeItem("gridiron_user");
  updateAuthUI();
  openLoginModal();
}

async function checkAuthSession() {
  updateAuthUI();
  if (state.authToken) {
    try {
      const res = await apiFetch("/api/auth/verify");
      if (!res.ok) {
        logoutUser();
        return;
      }
    } catch (e) {
      // Offline fallback
    }
  } else {
    openLoginModal();
  }
}

// Embedded Fallback Mock Dataset for Standalone Staging
const MOCK_DATA = {
  games: [
    {
      id: "nfl_2024_w11_kc_buf",
      league: "nfl",
      season: 2024,
      week: 11,
      home_code: "BUF", home_name: "Buffalo Bills", home_short: "Bills",
      home_score: 30, home_primary: "#00338D", home_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
      home_conference: "AFC", home_division: "East",
      away_code: "KC", away_name: "Kansas City Chiefs", away_short: "Chiefs",
      away_score: 21, away_primary: "#E31837", away_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
      away_conference: "AFC", away_division: "West",
      status: "final", venue: "Highmark Stadium", weather_temp: 46, weather_desc: "Nublado, Viento 12 mph",
      highlight_url: "https://www.youtube.com/results?search_query=Chiefs+vs+Bills+Week+11+2024+highlights",
      team_stats: [
        { is_home: false, total_yards: 259, passing_yards: 196, rushing_yards: 63, turnovers: 2, epa_total: -3.2, epa_pass: -0.8, epa_rush: -2.4, third_down_comp: 5, third_down_att: 10, red_zone_comp: 3, red_zone_att: 3 },
        { is_home: true, total_yards: 366, passing_yards: 262, rushing_yards: 104, turnovers: 1, epa_total: 14.8, epa_pass: 9.4, epa_rush: 5.4, third_down_comp: 9, third_down_att: 15, red_zone_comp: 3, red_zone_att: 4 }
      ],
      key_plays: [
        {
          id: "p1", quarter: 4, time_remaining: "02:17", down: 4, ydstogo: 2,
          description: "J.Allen acarreo de 26 yardas para TOUCHDOWN rompiendo 2 tackleadas. Sella la victoria.",
          epa: 4.65, wp_swing: 0.18, is_touchdown: 1, is_turnover: 0,
          video_url: "https://www.youtube.com/results?search_query=Josh+Allen+4th+down+touchdown+Chiefs"
        },
        {
          id: "p2", quarter: 4, time_remaining: "01:07", down: 4, ydstogo: 13,
          description: "P.Mahomes pase interceptado por T.Bernard en la yarda 45. Fin del invicto de Kansas City.",
          epa: -4.85, wp_swing: 0.05, is_touchdown: 0, is_turnover: 1,
          video_url: "https://www.youtube.com/results?search_query=Patrick+Mahomes+interception+Terrel+Bernard"
        }
      ],
      trivia: [
        { fact_text: "Los Bills rompen la racha de 15 victorias consecutivas de Patrick Mahomes (incluyendo playoffs)." },
        { fact_text: "Josh Allen registra su cuarta victoria de temporada regular ante Kansas City, mayor cifra en la era Mahomes." }
      ]
    },
    {
      id: "nfl_2024_w11_bal_pit",
      league: "nfl",
      season: 2024,
      week: 11,
      home_code: "PIT", home_name: "Pittsburgh Steelers", home_short: "Steelers",
      home_score: 18, home_primary: "#FFB612", home_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png",
      home_conference: "AFC", home_division: "North",
      away_code: "BAL", away_name: "Baltimore Ravens", away_short: "Ravens",
      away_score: 16, away_primary: "#241773", away_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
      away_conference: "AFC", away_division: "North",
      status: "final", venue: "Acrisure Stadium", weather_temp: 52, weather_desc: "Despejado",
      highlight_url: "https://www.youtube.com/results?search_query=Ravens+vs+Steelers+Week+11+2024+highlights",
      team_stats: [
        { is_home: false, total_yards: 329, passing_yards: 205, rushing_yards: 124, turnovers: 3, epa_total: -6.4, epa_pass: -3.1, epa_rush: -3.3, third_down_comp: 4, third_down_att: 11, red_zone_comp: 1, red_zone_att: 3 },
        { is_home: true, total_yards: 303, passing_yards: 181, rushing_yards: 122, turnovers: 1, epa_total: 1.2, epa_pass: 0.5, epa_rush: 0.7, third_down_comp: 4, third_down_att: 16, red_zone_comp: 0, red_zone_att: 4 }
      ],
      key_plays: [
        {
          id: "p_bal_1", quarter: 1, time_remaining: "13:22", down: 2, ydstogo: 8,
          description: "D.Henry acarreo con balón suelto forzado por P.Queen y recuperado por M.Fitzpatrick.",
          epa: -3.90, wp_swing: 0.19, is_touchdown: 0, is_turnover: 1,
          video_url: "https://www.youtube.com/results?search_query=Derrick+Henry+fumble+Steelers+Week+11"
        }
      ],
      trivia: [
        { fact_text: "Pittsburgh limitó a la ofensiva #1 de la liga a solo 16 puntos y provocó 3 entregas de balón." }
      ]
    },
    {
      id: "nfl_2024_w11_gb_chi",
      league: "nfl",
      season: 2024,
      week: 11,
      home_code: "CHI", home_name: "Chicago Bears", home_short: "Bears",
      home_score: 19, home_primary: "#0B162A", home_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
      home_conference: "NFC", home_division: "North",
      away_code: "GB", away_name: "Green Bay Packers", away_short: "Packers",
      away_score: 20, away_primary: "#203731", away_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png",
      away_conference: "NFC", away_division: "North",
      status: "final", venue: "Soldier Field", weather_temp: 48, weather_desc: "Viento 18 mph",
      highlight_url: "https://www.youtube.com/results?search_query=Packers+vs+Bears+Week+11+2024+highlights",
      team_stats: [],
      key_plays: [
        {
          id: "p_gb_1", quarter: 4, time_remaining: "00:03", down: 4, ydstogo: 6,
          description: "C.Santos intento de FG de 46 yardas BLOQUEADO por K.Brooks en la última jugada.",
          epa: -4.20, wp_swing: 0.76, is_touchdown: 0, is_turnover: 0,
          video_url: "https://www.youtube.com/results?search_query=Packers+blocked+field+goal+Bears+Karl+Brooks"
        }
      ],
      trivia: [
        { fact_text: "Green Bay suma 11 victorias al hilo sobre los Bears, la racha más larga de la rivalidad más antigua de la NFL." }
      ]
    },
    {
      id: "nfl_2024_w11_det_jax",
      league: "nfl",
      season: 2024,
      week: 11,
      home_code: "DET", home_name: "Detroit Lions", home_short: "Lions",
      home_score: 52, home_primary: "#0076B6", home_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
      home_conference: "NFC", home_division: "North",
      away_code: "JAX", away_name: "Jacksonville Jaguars", away_short: "Jaguars",
      away_score: 6, away_primary: "#006778", away_logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png",
      away_conference: "AFC", away_division: "South",
      status: "final", venue: "Ford Field", weather_temp: 70, weather_desc: "Domo",
      highlight_url: "https://www.youtube.com/results?search_query=Jaguars+vs+Lions+Week+11+2024+highlights",
      team_stats: [],
      key_plays: [],
      trivia: [
        { fact_text: "Los Lions anotaron touchdown en sus primeras 7 posesiones consecutivas del partido." }
      ]
    },
    {
      id: "ncaa_2024_w11_uga_ala",
      league: "ncaa",
      season: 2024,
      week: 11,
      home_code: "ALA", home_name: "Alabama Crimson Tide", home_short: "Alabama",
      home_score: 41, home_primary: "#9E1B32", home_logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
      home_conference: "SEC", home_division: null,
      away_code: "UGA", away_name: "Georgia Bulldogs", away_short: "Georgia",
      away_score: 34, away_primary: "#BA0C2F", away_logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png",
      away_conference: "SEC", away_division: null,
      status: "final", venue: "Bryant-Denny Stadium", weather_temp: 64, weather_desc: "Despejado",
      highlight_url: "https://www.youtube.com/results?search_query=Georgia+vs+Alabama+2024+highlights",
      team_stats: [],
      key_plays: [],
      trivia: [
        { fact_text: "Duelo épico de la SEC: Jalen Milroe lanzó para más de 300 yardas y corrió para 2 anotaciones." }
      ]
    }
  ],
  awards: [
    {
      category: "MVP",
      candidate_name: "Josh Allen (QB, Buffalo Bills)",
      stat_summary: "Mayor impacto global neto: +21.4 EPA | Derrotó al invicto bicampeón Chiefs",
      clip_url: "https://www.youtube.com/results?search_query=Josh+Allen+MVP+Week+11",
      rank: 1
    },
    {
      category: "MVP",
      candidate_name: "Jared Goff (QB, Detroit Lions)",
      stat_summary: "412 yds, 4 TD, 0 INT, Passer Rating perfecto de 158.3 (+19.8 EPA)",
      clip_url: "https://www.youtube.com/results?search_query=Jared+Goff+perfect+rating",
      rank: 2
    },
    {
      category: "OPOW",
      candidate_name: "Josh Allen (Buffalo Bills)",
      stat_summary: "262 yds pase, 55 yds carrera, 2 TD totales | +21.4 EPA",
      clip_url: "https://www.youtube.com/results?search_query=Josh+Allen+Week+11+Chiefs+run",
      rank: 1
    },
    {
      category: "OPOW",
      candidate_name: "Amon-Ra St. Brown (Detroit Lions)",
      stat_summary: "11 recepciones, 161 yardas, 2 Touchdowns",
      clip_url: "https://www.youtube.com/results?search_query=Amon-Ra+St+Brown+Week+11",
      rank: 2
    },
    {
      category: "DPOW",
      candidate_name: "T.J. Watt (Pittsburgh Steelers)",
      stat_summary: "2.5 Sacks, 1 Intercepción, 8 Tackleadas vs Ofensiva #1 de Ravens",
      clip_url: "https://www.youtube.com/results?search_query=TJ+Watt+vs+Ravens+Week+11",
      rank: 1
    },
    {
      category: "SPECIAL_TEAMS",
      candidate_name: "Karl Brooks (Green Bay Packers)",
      stat_summary: "Bloqueó gol de campo de 46 yds con 0:03 restantes (WP Swing: +76.0%)",
      clip_url: "https://www.youtube.com/results?search_query=Karl+Brooks+blocked+field+goal",
      rank: 1
    },
    {
      category: "DO",
      candidate_name: "Acarreo de 26 yardas de Josh Allen en 4ta y 2",
      stat_summary: "Jugada Maestra (+4.65 EPA) rompiendo dos tackleadas para sentenciar a KC",
      clip_url: "https://www.youtube.com/results?search_query=Josh+Allen+touchdown+run+vs+Chiefs",
      rank: 1
    },
    {
      category: "DONT",
      candidate_name: "Pase interceptado a Patrick Mahomes con 1:07 restante",
      stat_summary: "Error Garrafal (-4.85 EPA) forzando envío bajo presión en 4ta y 13",
      clip_url: "https://www.youtube.com/results?search_query=Patrick+Mahomes+interception+vs+Bills",
      rank: 1
    }
  ]
};

// Initial Fetch
async function initApp() {
  try {
    const res = await apiFetch(`/api/games?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (res.status === 401) {
      openLoginModal();
      state.games = MOCK_DATA.games;
    } else if (res.ok) {
      const data = await res.json();
      state.games = data.length > 0 ? data : MOCK_DATA.games;
    } else {
      state.games = MOCK_DATA.games;
    }
  } catch (e) {
    state.games = MOCK_DATA.games;
  }

  try {
    const awardsRes = await apiFetch(`/api/awards?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (awardsRes.status === 401) {
      openLoginModal();
      state.awards = MOCK_DATA.awards;
    } else if (awardsRes.ok) {
      const aData = await awardsRes.json();
      state.awards = aData.length > 0 ? aData : MOCK_DATA.awards;
    } else {
      state.awards = MOCK_DATA.awards;
    }
  } catch (e) {
    state.awards = MOCK_DATA.awards;
  }

  renderGames();
  renderAwards();
}

// Switch between NFL and NCAA
function switchLeague(league) {
  state.league = league;
  document.getElementById("btn-league-nfl").classList.toggle("active", league === "nfl");
  document.getElementById("btn-league-ncaa").classList.toggle("active", league === "ncaa");
  state.divisionFilter = "ALL";
  renderGames();
}

// Switch View: Games vs Awards vs Script
function switchView(view) {
  state.view = view;
  document.getElementById("btn-view-games").classList.toggle("active", view === "games");
  document.getElementById("btn-view-awards").classList.toggle("active", view === "awards");
  document.getElementById("btn-view-script").classList.toggle("active", view === "script");

  document.getElementById("view-games").style.display = view === "games" ? "block" : "none";
  document.getElementById("view-awards").style.display = view === "awards" ? "block" : "none";
  document.getElementById("view-script").style.display = view === "script" ? "block" : "none";

  if (view === "script") {
    loadYoutubeScript();
  }
}

// Division Filter
function filterDivision(div) {
  state.divisionFilter = div;
  const pills = document.querySelectorAll("#division-filters .pill-btn");
  pills.forEach(p => p.classList.remove("active"));
  event.target.classList.add("active");
  renderGames();
}

// Render Games Grid
function renderGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "";

  const filtered = state.games.filter(g => {
    if (g.league !== state.league) return false;
    if (state.divisionFilter === "ALL") return true;
    if (state.divisionFilter === "AFC") return g.home_conference === "AFC" || g.away_conference === "AFC";
    if (state.divisionFilter === "NFC") return g.home_conference === "NFC" || g.away_conference === "NFC";
    if (state.divisionFilter === "SEC") return g.home_conference === "SEC" || g.away_conference === "SEC";
    const div = state.divisionFilter.replace("AFC ", "").replace("NFC ", "");
    return g.home_division === div || g.away_division === div;
  });

  document.getElementById("kpi-games-count").textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
      No hay partidos programados en esta conferencia para la semana seleccionada.
    </div>`;
    return;
  }

  filtered.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => openGameDrawer(game.id);

    const awayCode = (game.away_code || "NFL").toLowerCase();
    const homeCode = (game.home_code || "NFL").toLowerCase();
    const awayLogo = game.away_logo || (game.league === "ncaa" ? "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png" : `https://a.espncdn.com/i/teamlogos/nfl/500/${awayCode}.png`);
    const homeLogo = game.home_logo || (game.league === "ncaa" ? "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png" : `https://a.espncdn.com/i/teamlogos/nfl/500/${homeCode}.png`);

    card.innerHTML = `
      <div class="game-card-meta">
        <span>📍 ${game.venue || "Estadio"}</span>
        <span class="status-badge">${game.status === 'final' ? 'FINAL' : 'EN VIVO'}</span>
      </div>

      <div class="scoreboard-row">
        <div class="team-info">
          <img src="${awayLogo}" class="team-logo" alt="${game.away_code}" onerror="this.onerror=null; this.src='https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png'">
          <span class="team-name">${game.away_name || game.away_code}</span>
        </div>
        <span class="team-score">${game.away_score}</span>
      </div>

      <div class="scoreboard-row">
        <div class="team-info">
          <img src="${homeLogo}" class="team-logo" alt="${game.home_code}" onerror="this.onerror=null; this.src='https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png'">
          <span class="team-name">${game.home_name || game.home_code}</span>
        </div>
        <span class="team-score">${game.home_score}</span>
      </div>

      <div class="game-card-footer">
        <span>🌡 ${game.weather_temp ? game.weather_temp + '°F' : 'Clima N/D'}</span>
        <div style="display: flex; gap: 0.35rem;">
          <span class="badge-metric badge-wp-swing">Ficha & Analytics →</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Open Game Detail Drawer
async function openGameDrawer(gameId) {
  let game = state.games.find(g => g.id === gameId);
  try {
    const res = await apiFetch(`/api/games/${gameId}`);
    if (res.status === 401) {
      openLoginModal();
    } else if (res.ok) {
      game = await res.json();
    }
  } catch (e) {
    // fallback to local object
  }

  if (!game) return;

  document.getElementById("drawer-venue").textContent = `${game.venue || "Estadio"} • ${game.weather_desc || ""}`;
  document.getElementById("drawer-title").textContent = `${game.away_name || game.away_code} (${game.away_score}) @ ${game.home_name || game.home_code} (${game.home_score})`;
  document.getElementById("th-away-team").textContent = game.away_code;
  document.getElementById("th-home-team").textContent = game.home_code;

  // Render Stats Table
  const statsBody = document.getElementById("drawer-stats-body");
  const stats = game.team_stats || [];
  const awayStat = stats.find(s => !s.is_home) || {};
  const homeStat = stats.find(s => s.is_home) || {};

  statsBody.innerHTML = `
    <tr>
      <td>EPA Total</td>
      <td style="color: ${awayStat.epa_total >= 0 ? 'var(--metric-positive)' : 'var(--metric-negative)'}">${awayStat.epa_total ?? '-'}</td>
      <td style="color: ${homeStat.epa_total >= 0 ? 'var(--metric-positive)' : 'var(--metric-negative)'}">${homeStat.epa_total ?? '-'}</td>
    </tr>
    <tr>
      <td>EPA Pase / Carrera</td>
      <td>${awayStat.epa_pass ?? '-'}/${awayStat.epa_rush ?? '-'}</td>
      <td>${homeStat.epa_pass ?? '-'}/${homeStat.epa_rush ?? '-'}</td>
    </tr>
    <tr>
      <td>Yardas Totales</td>
      <td>${awayStat.total_yards ?? '-'}</td>
      <td>${homeStat.total_yards ?? '-'}</td>
    </tr>
    <tr>
      <td>Yardas Pase / Carrera</td>
      <td>${awayStat.passing_yards ?? '-'}/${awayStat.rushing_yards ?? '-'}</td>
      <td>${homeStat.passing_yards ?? '-'}/${homeStat.rushing_yards ?? '-'}</td>
    </tr>
    <tr>
      <td>Entregas de Balón (Turnovers)</td>
      <td style="color: ${awayStat.turnovers > 0 ? 'var(--metric-negative)' : 'inherit'}">${awayStat.turnovers ?? 0}</td>
      <td style="color: ${homeStat.turnovers > 0 ? 'var(--metric-negative)' : 'inherit'}">${homeStat.turnovers ?? 0}</td>
    </tr>
    <tr>
      <td>Terceras Oportunidades</td>
      <td>${awayStat.third_down_comp ?? 0}/${awayStat.third_down_att ?? 0}</td>
      <td>${homeStat.third_down_comp ?? 0}/${homeStat.third_down_att ?? 0}</td>
    </tr>
  `;

  // Render Plays
  const playsList = document.getElementById("drawer-plays-list");
  const plays = game.key_plays || [];
  if (plays.length === 0) {
    playsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">No hay jugadas de alto apalancamiento registradas para este juego.</div>`;
  } else {
    playsList.innerHTML = plays.map(p => `
      <div class="play-item">
        <div class="play-header">
          <span style="font-weight: 700; color: var(--text-secondary);">[Q${p.quarter} ${p.time_remaining}]</span>
          <div style="display: flex; gap: 0.35rem;">
            <span class="badge-metric badge-wp-swing">WP Swing: +${Math.round((p.wp_swing || 0) * 100)}%</span>
            <span class="badge-metric ${p.epa >= 0 ? 'badge-epa-pos' : 'badge-metric'}" style="${p.epa < 0 ? 'color: var(--metric-negative);' : ''}">${p.epa >= 0 ? '+' : ''}${p.epa} EPA</span>
          </div>
        </div>
        <div class="play-desc">${p.description}</div>
        <a href="${p.video_url || '#'}" target="_blank" rel="noopener" class="play-btn">
          ▶ Buscar jugada en YouTube
        </a>
      </div>
    `).join("");
  }

  // Render Trivia
  const triviaList = document.getElementById("drawer-trivia-list");
  const trivia = game.trivia || [];
  if (trivia.length === 0) {
    triviaList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">No hay viñetas históricas calculadas.</div>`;
  } else {
    triviaList.innerHTML = trivia.map(t => `
      <div class="trivia-item">
        🎙 ${t.fact_text}
      </div>
    `).join("");
  }

  document.getElementById("drawer-modal").classList.add("active");
}

function closeDrawer() {
  document.getElementById("drawer-modal").classList.remove("active");
}

// Render Awards View
function renderAwards() {
  const container = document.getElementById("awards-container");
  container.innerHTML = "";

  const categories = [
    { key: "MVP", title: "🌟 Jugador Más Valioso (MVP de la Semana)" },
    { key: "OPOW", title: "⚡ Jugador Ofensivo de la Semana (OPOW)" },
    { key: "DPOW", title: "🛡 Jugador Defensivo de la Semana (DPOW)" },
    { key: "SPECIAL_TEAMS", title: "👟 Equipos Especiales de la Semana" },
    { key: "DO", title: "🎯 DO: Jugada Maestra de la Jornada (Top EPA)" },
    { key: "DONT", title: "⚠️ DON'T: Error Garrafal de la Jornada" }
  ];

  categories.forEach(cat => {
    const nominees = state.awards.filter(a => a.category === cat.key);
    if (nominees.length === 0) return;

    const card = document.createElement("div");
    card.className = "award-card";
    card.innerHTML = `
      <div class="award-header">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">${cat.title}</h3>
      </div>
      <div class="award-body">
        ${nominees.map(n => `
          <div class="award-candidate">
            <span class="candidate-rank">#${n.rank}</span>
            <div class="candidate-info">
              <div class="candidate-name">${n.candidate_name}</div>
              <div class="candidate-summary">${n.stat_summary}</div>
              <a href="${n.clip_url}" target="_blank" rel="noopener" class="play-btn" style="margin-top: 0.35rem;">
                ▶ Ver clip
              </a>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    container.appendChild(card);
  });
}

// Staging & Test Panel Functions (Solo para tus ojos)
function toggleTestPanel() {
  const p = document.getElementById("test-panel");
  p.classList.toggle("active");
}

function loadMockDataset() {
  state.games = MOCK_DATA.games;
  state.awards = MOCK_DATA.awards;
  renderGames();
  renderAwards();
  alert("✅ Fixtures de Staging Mock Preview recargadas con éxito.");
}

function simulateGameEnd() {
  const simGame = {
    id: "nfl_sim_live_final",
    league: "nfl",
    season: 2024,
    week: 11,
    home_code: "PHI", home_name: "Philadelphia Eagles", home_short: "Eagles",
    home_score: 26, home_primary: "#004C54", home_logo: "https://raw.githubusercontent.com/nflverse/nflplotR/main/data-raw/logos/phi.svg",
    home_conference: "NFC", home_division: "East",
    away_code: "WAS", away_name: "Washington Commanders", away_short: "Commanders",
    away_score: 18, away_primary: "#5A1414", away_logo: "https://raw.githubusercontent.com/nflverse/nflplotR/main/data-raw/logos/was.svg",
    away_conference: "NFC", away_division: "East",
    status: "final", venue: "Lincoln Financial Field", weather_temp: 50, weather_desc: "Noche despejada",
    team_stats: [], key_plays: [], trivia: [{ fact_text: "Eagles consolidan la cima de la NFC East con triunfo divisional." }]
  };

  state.games.unshift(simGame);
  renderGames();
  alert("⚡ Partido simulado en vivo (Commanders vs Eagles) procesado como FINAL.");
}

function copyYoutubeNotes() {
  let notes = `# 🏈 GUION Y PAUTA DE INVESTIGACIÓN — GRIDIRON HUB (SEMANA 11)\n\n`;
  notes += `## 🌟 PREMIOS DE LA SEMANA\n`;
  state.awards.forEach(a => {
    notes += `* **[${a.category} #${a.rank}]** ${a.candidate_name}: ${a.stat_summary}\n`;
  });
  notes += `\n## ⚡ PARTIDOS DESTACADOS & EPA\n`;
  state.games.forEach(g => {
    notes += `* **${g.away_code} (${g.away_score}) @ ${g.home_code} (${g.home_score})** — ${g.venue}\n`;
    if (g.trivia && g.trivia.length > 0) {
      notes += `  - Dato: ${g.trivia[0].fact_text}\n`;
    }
  });

  navigator.clipboard.writeText(notes).then(() => {
    alert("📋 Resumen para teleprompter copiado al portapapeles con éxito.");
  }).catch(() => {
    alert("Notas generadas en consola del navegador.");
    console.log(notes);
  });
}

// YouTube Script Studio Controller
let currentGeneratedScript = "";

async function loadYoutubeScript() {
  const pre = document.getElementById("script-content-pre");
  const titlesList = document.getElementById("script-titles-list");
  pre.textContent = "⏳ Generando guion analítico y calculando tiempos de locución...";
  titlesList.innerHTML = "";

  try {
    const res = await apiFetch(`/api/scripts/generate?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (res.status === 401) {
      openLoginModal();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      currentGeneratedScript = data.script_markdown;

      // Metadata badges
      if (data.metadata) {
        document.getElementById("script-duration-badge").textContent = `⏱️ ${data.metadata.duration_formatted} estimados`;
        document.getElementById("script-words-badge").textContent = `${data.metadata.word_count.toLocaleString()} palabras`;
      }

      // Titles
      if (data.suggested_titles) {
        titlesList.innerHTML = data.suggested_titles.map((t, idx) => `
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.82rem;">
            <span><strong>#${idx + 1}</strong> ${t}</span>
            <button class="pill-btn" style="font-size: 0.7rem; padding: 0.15rem 0.5rem;" onclick="navigator.clipboard.writeText('${t.replace(/'/g, "\\'")}'); alert('Título copiado');">Copiar</button>
          </div>
        `).join("");
      }

      pre.textContent = data.script_markdown;
      return;
    }
  } catch (e) {
    // Fallback if backend API is not responding
  }

  // Standalone offline fallback
  currentGeneratedScript = `# 🎙️ GUION DE TELEPROMPTER — GRIDIRON HUB (SEMANA ${state.week})\n\n` +
    `## ⏱️ [00:00 - 01:15] BLOQUE 1: HOOK\n"¡Bienvenidos a Gridiron Hub! Semana vibrante donde cayó el último invicto..."\n\n` +
    `## ⏱️ [01:15 - 05:00] BLOQUE 2: EL PARTIDO DE LA SEMANA\n"Buffalo 30 @ 21 Kansas City: Análisis táctico y métricas EPA..."\n\n` +
    `## ⏱️ [08:30 - 11:30] BLOQUE 4: GALA DE PREMIOS\n* MVP: Josh Allen (+21.4 EPA)\n* DPOW: T.J. Watt (2.5 sacks)\n\n` +
    `## ⏱️ [11:30 - 14:00] BLOQUE 5: DOs & DON'Ts\n* DO: Acarreo de 26 yds de Allen en 4ta y 2 (+4.65 EPA)\n* DON'T: Intercepción de Mahomes en 4ta y 13 (-4.85 EPA)\n\n` +
    `## ⏱️ [14:00 - 15:00] BLOQUE 6: CIERRE & CALL TO ACTION\n"¿Es Josh Allen el MVP indiscutible? Déjalo en comentarios. ¡Suscríbete!"`;

  pre.textContent = currentGeneratedScript;
}

function copyFullScript() {
  if (!currentGeneratedScript) return;
  navigator.clipboard.writeText(currentGeneratedScript).then(() => {
    alert("📋 Guion completo para teleprompter copiado al portapapeles con éxito.");
  }).catch(() => {
    alert("Copiado a consola del navegador.");
  });
}

function downloadScriptFile() {
  if (!currentGeneratedScript) return;
  const blob = new Blob([currentGeneratedScript], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `guion_youtube_${state.league}_semana_${state.week}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Bootstrap on Load
window.addEventListener("DOMContentLoaded", async () => {
  await checkAuthSession();
  await initApp();
});



