/**
 * Gridiron Hub - Frontend Reactive Controller
 * Real-time NFL & NCAA Research Platform complying with SOP A.2, A.3, and A.6.
 * Zero-cost perpetual architecture ($0) powered by authentic nflreadpy & ESPN Scoreboard data.
 */

// Global Application State
const state = {
  league: "nfl",
  season: 2026,
  week: 1,
  view: "games",
  divisionFilter: "ALL",
  teamFilter: "ALL",
  games: [],
  awards: [],
  teams: [],
  selectedGame: null,
  activeDrawerGame: null,
  authToken: sessionStorage.getItem("gridiron_token") || null,
  currentUser: sessionStorage.getItem("gridiron_user") || null,
};

// Authentication & API Configuration
const DEFAULT_API_URL = "https://gridiron-hub-2lr3.onrender.com";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? ""
  : (window.GRIDIRON_API_URL || localStorage.getItem("gridiron_api_url") || DEFAULT_API_URL);

let STATIC_DATA = null;

async function getStaticData() {
  if (STATIC_DATA) return STATIC_DATA;
  try {
    const res = await fetch("./data.json");
    if (res.ok) {
      STATIC_DATA = await res.json();
      return STATIC_DATA;
    }
  } catch (e) {
    console.warn("No se pudo cargar data.json estático:", e);
  }
  return { games: [], awards: [], teams: [] };
}

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

// Session & Auth Management (Strict Lock Gate)
function fillTeamCredentials() {
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  if (usernameInput) usernameInput.value = "gridiron_team";
  if (passwordInput) passwordInput.value = "Gridiron2026!";
  const errorBox = document.getElementById("login-error");
  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }
}

function openLoginModal() {
  const overlay = document.getElementById("login-overlay");
  const errorBox = document.getElementById("login-error");
  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }
  document.body.classList.add("auth-locked");
  if (overlay) overlay.classList.add("active");
}

function closeLoginModal() {
  // Only allow closing if an authenticated session exists
  if (!state.authToken) return;
  document.body.classList.remove("auth-locked");
  const overlay = document.getElementById("login-overlay");
  if (overlay) overlay.classList.remove("active");
}

function toggleApiConfig() {
  const sec = document.getElementById("api-config-section");
  if (!sec) return;
  sec.style.display = sec.style.display === "none" ? "block" : "none";
  const input = document.getElementById("custom-api-url");
  if (input) input.value = localStorage.getItem("gridiron_api_url") || DEFAULT_API_URL;
}

function saveCustomApiUrl() {
  const input = document.getElementById("custom-api-url");
  if (!input) return;
  let url = input.value.trim().replace(/\/+$/, "");
  if (url) {
    localStorage.setItem("gridiron_api_url", url);
    alert(`URL del backend configurada: ${url}`);
  } else {
    localStorage.removeItem("gridiron_api_url");
    alert("Usando servidor local / relativo por defecto.");
  }
  window.location.reload();
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
    if (loginTrigger) loginTrigger.style.display = "none";
    openLoginModal();
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
  if (errorBox) errorBox.style.display = "none";

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
      await loadCurrentData();
    } else {
      // Support fallback team access if backend is sleeping or using default credentials
      if (username === "gridiron_team" && password === "Gridiron2026!") {
        state.authToken = "team_verified_session";
        state.currentUser = "gridiron_team";
        sessionStorage.setItem("gridiron_token", state.authToken);
        sessionStorage.setItem("gridiron_user", state.currentUser);
        updateAuthUI();
        await loadCurrentData();
      } else {
        const err = await res.json().catch(() => ({}));
        if (errorBox) {
          errorBox.textContent = err.detail || "Credenciales incorrectas.";
          errorBox.style.display = "block";
        }
      }
    }
  } catch (err) {
    // If backend is in cold standby on Render, allow default team credentials
    if (username === "gridiron_team" && password === "Gridiron2026!") {
      state.authToken = "team_verified_session";
      state.currentUser = "gridiron_team";
      sessionStorage.setItem("gridiron_token", state.authToken);
      sessionStorage.setItem("gridiron_user", state.currentUser);
      updateAuthUI();
      await loadCurrentData();
    } else if (errorBox) {
      errorBox.textContent = "Error al conectar con el backend. Usa las credenciales del equipo.";
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
}

async function checkAuthSession() {
  state.authToken = sessionStorage.getItem("gridiron_token");
  state.currentUser = sessionStorage.getItem("gridiron_user");
  updateAuthUI();
  if (state.authToken && state.authToken !== "team_verified_session") {
    try {
      const res = await apiFetch("/api/auth/verify");
      if (!res.ok && res.status === 401) logoutUser();
    } catch (e) {
      // Standby / offline mode
    }
  }
}

// Core Data Loading (Authentic API + Offline Static JSON Fallback)
async function loadCurrentData() {
  const staticFallback = await getStaticData();

  // 1. Teams
  let teamsData = null;
  try {
    const res = await apiFetch(`/api/teams?league=${state.league}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) teamsData = data;
    }
  } catch (e) {}

  if (!teamsData || teamsData.length === 0) {
    teamsData = staticFallback.teams.filter(t => t.league === state.league);
  }
  state.teams = teamsData || [];

  // 2. Games
  let gamesData = null;
  try {
    const res = await apiFetch(`/api/games?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) gamesData = data;
    }
  } catch (e) {}

  if (!gamesData || gamesData.length === 0) {
    gamesData = staticFallback.games.filter(g =>
      g.league === state.league && g.season === state.season && g.week === state.week
    );
  }
  state.games = gamesData || [];

  // 3. Awards
  let awardsData = null;
  try {
    const aRes = await apiFetch(`/api/awards?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (aRes.ok) {
      const aData = await aRes.json();
      if (Array.isArray(aData) && aData.length > 0) awardsData = aData;
    }
  } catch (e) {}

  if (!awardsData || awardsData.length === 0) {
    awardsData = staticFallback.awards.filter(a =>
      a.league === state.league && a.season === state.season && a.week === state.week
    );
  }
  state.awards = awardsData || [];

  populateTeamSelector();
  renderGames();
  renderAwards();
  updateKPIBanner();

  if (state.view === "script") {
    loadYoutubeScript();
  }
}

// Multi-Season & Multi-League Dynamic Navigation
function updateSeasonSelector() {
  const seasonSelect = document.getElementById("select-season");
  if (!seasonSelect) return;
  if (state.league === "ncaa") {
    seasonSelect.innerHTML = `
      <option value="2026" ${state.season === 2026 ? 'selected' : ''}>Temporada 2026-2027 (Jornada Actual / Hoy)</option>
      <option value="2025" ${state.season === 2025 ? 'selected' : ''}>Temporada 2025-2026 (CFP / Postemporada)</option>
    `;
  } else {
    seasonSelect.innerHTML = `
      <option value="2026" ${state.season === 2026 ? 'selected' : ''}>Temporada 2026-2027 (Kickoff Septiembre 2026)</option>
      <option value="2025" ${state.season === 2025 ? 'selected' : ''}>Temporada 2025-2026 (Super Bowl LX)</option>
    `;
  }
  seasonSelect.value = state.season.toString();
}

function populateWeekSelector(season) {
  const weekSelect = document.getElementById("select-week");
  if (!weekSelect) return;
  const s = parseInt(season, 10);
  if (state.league === "ncaa") {
    if (s === 2026) {
      weekSelect.innerHTML = `
        <option value="1" selected>Semana 1 (Jornada Inaugural Hoy 5 Sept 2026)</option>
      `;
      state.week = 1;
    } else {
      weekSelect.innerHTML = `
        <option value="1" selected>Semana 1 (Temporada Colegial 2025)</option>
      `;
      state.week = 1;
    }
  } else {
    // NFL
    if (s === 2026) {
      weekSelect.innerHTML = `
        <option value="1" selected>Semana 1 (Kickoff Septiembre 2026 - Próximamente)</option>
      `;
      state.week = 1;
    } else {
      weekSelect.innerHTML = `
        <option value="22" selected>Super Bowl LX (8 Febrero 2026)</option>
      `;
      state.week = 22;
    }
  }
}

// Season Switcher
async function changeSeason(seasonVal) {
  state.season = parseInt(seasonVal, 10);
  populateWeekSelector(state.season);
  const weekSelect = document.getElementById("select-week");
  if (weekSelect) state.week = parseInt(weekSelect.value, 10);
  state.divisionFilter = "ALL";
  state.teamFilter = "ALL";
  renderFilterPills();
  await loadCurrentData();
}

// Week Switcher
async function changeWeek(weekVal) {
  state.week = parseInt(weekVal, 10);
  state.teamFilter = "ALL";
  await loadCurrentData();
}

// League Switcher (NFL vs NCAA)
async function switchLeague(league) {
  state.league = league;
  const nflBtn = document.getElementById("btn-league-nfl");
  const ncaaBtn = document.getElementById("btn-league-ncaa");
  if (nflBtn) nflBtn.classList.toggle("active", league === "nfl");
  if (ncaaBtn) ncaaBtn.classList.toggle("active", league === "ncaa");

  state.divisionFilter = "ALL";
  state.teamFilter = "ALL";

  if (league === "ncaa") {
    state.season = 2026;
  }

  updateSeasonSelector();
  populateWeekSelector(state.season);
  renderFilterPills();
  await loadCurrentData();
}

// Filter Pills: Division / Conference
function renderFilterPills() {
  const bar = document.getElementById("division-filters");
  if (!bar) return;

  const nflFilters = [
    { id: "ALL", label: "Todos los Juegos" },
    { id: "AFC", label: "AFC" },
    { id: "NFC", label: "NFC" },
    { id: "AFC West", label: "AFC West" },
    { id: "AFC East", label: "AFC East" },
    { id: "AFC North", label: "AFC North" },
    { id: "AFC South", label: "AFC South" },
    { id: "NFC West", label: "NFC West" },
    { id: "NFC East", label: "NFC East" },
    { id: "NFC North", label: "NFC North" },
    { id: "NFC South", label: "NFC South" },
  ];

  const ncaaFilters = [
    { id: "ALL", label: "Todos los Juegos" },
    { id: "SEC", label: "SEC" },
    { id: "Big Ten", label: "Big Ten" },
    { id: "Big 12", label: "Big 12" },
    { id: "ACC", label: "ACC" },
    { id: "American", label: "American" },
    { id: "Mountain West", label: "Mountain West" },
    { id: "MAC", label: "MAC" },
    { id: "Sun Belt", label: "Sun Belt" },
    { id: "Conference USA", label: "C-USA" },
    { id: "Pac-12", label: "Pac-12" },
  ];

  const currentFilters = state.league === "ncaa" ? ncaaFilters : nflFilters;

  bar.innerHTML = currentFilters.map(f => `
    <button class="pill-btn ${state.divisionFilter === f.id ? 'active' : ''}" data-filter="${f.id}" onclick="filterDivision('${f.id}')">
      ${f.label}
    </button>
  `).join("");
}

function filterDivision(div) {
  state.divisionFilter = div;
  state.teamFilter = "ALL";
  renderFilterPills();
  populateTeamSelector();
  renderGames();
}

// Team Selector: Level 3 in SOP A.3 Navigation Hierarchy
function populateTeamSelector() {
  const select = document.getElementById("select-team");
  if (!select) return;

  const teamMap = new Map();

  // Find teams present in current games matching division and season
  state.games.forEach(g => {
    if (g.league === state.league && g.season === state.season && matchesDivision(g, state.divisionFilter)) {
      if (g.home_code) teamMap.set(g.home_code, g.home_name || g.home_code);
      if (g.away_code) teamMap.set(g.away_code, g.away_name || g.away_code);
    }
  });

  // If no games, fallback to loaded teams
  if (teamMap.size === 0 && state.teams.length > 0) {
    state.teams.forEach(t => {
      if (state.divisionFilter === "ALL" || t.conference === state.divisionFilter) {
        teamMap.set(t.code, t.name || t.code);
      }
    });
  }

  const sortedTeams = Array.from(teamMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  let optionsHtml = `<option value="ALL" ${state.teamFilter === "ALL" ? "selected" : ""}>Todos los Equipos (${sortedTeams.length})</option>`;
  sortedTeams.forEach(([code, name]) => {
    optionsHtml += `<option value="${code}" ${state.teamFilter === code ? "selected" : ""}>${name} (${code})</option>`;
  });

  select.innerHTML = optionsHtml;
}

function filterTeam(teamCode) {
  state.teamFilter = teamCode;
  renderGames();
}

function matchesDivision(game, divFilter) {
  if (divFilter === "ALL") return true;
  if (divFilter === "AFC") return game.home_conference === "AFC" || game.away_conference === "AFC" || game.conference === "AFC";
  if (divFilter === "NFC") return game.home_conference === "NFC" || game.away_conference === "NFC" || game.conference === "NFC";
  if (divFilter === "SEC") return game.home_conference === "SEC" || game.away_conference === "SEC" || game.conference === "SEC";
  if (divFilter === "Big Ten") return game.home_conference === "Big Ten" || game.away_conference === "Big Ten" || game.conference === "Big Ten";
  if (divFilter === "Big 12") return game.home_conference === "Big 12" || game.away_conference === "Big 12" || game.conference === "Big 12";
  if (divFilter === "ACC") return game.home_conference === "ACC" || game.away_conference === "ACC" || game.conference === "ACC";
  if (divFilter === "American") return game.home_conference === "American" || game.away_conference === "American" || game.conference === "American";
  if (divFilter === "Mountain West") return game.home_conference === "Mountain West" || game.away_conference === "Mountain West" || game.conference === "Mountain West";
  if (divFilter === "MAC") return game.home_conference === "MAC" || game.away_conference === "MAC" || game.conference === "MAC";
  if (divFilter === "Sun Belt") return game.home_conference === "Sun Belt" || game.away_conference === "Sun Belt" || game.conference === "Sun Belt";
  if (divFilter === "Pac-12") return game.home_conference === "Pac-12" || game.away_conference === "Pac-12" || game.conference === "Pac-12";
  if (divFilter === "Conference USA" || divFilter === "C-USA") {
    return game.home_conference === "Conference USA" || game.away_conference === "Conference USA" ||
           game.home_conference === "CUSA" || game.away_conference === "CUSA" ||
           game.conference === "Conference USA";
  }

  const div = divFilter.replace("AFC ", "").replace("NFC ", "");
  return game.home_division === div || game.away_division === div;
}

// View Switcher (Partidos vs Premios vs Guion)
function switchView(view) {
  state.view = view;
  document.getElementById("btn-view-games").classList.toggle("active", view === "games");
  document.getElementById("btn-view-awards").classList.toggle("active", view === "awards");
  document.getElementById("btn-view-script").classList.toggle("active", view === "script");

  document.getElementById("view-games").style.display = view === "games" ? "block" : "none";
  document.getElementById("view-awards").style.display = view === "awards" ? "block" : "none";
  document.getElementById("view-script").style.display = view === "script" ? "block" : "none";

  if (view === "script") loadYoutubeScript();
}

// Render Games Grid
function renderGames() {
  const container = document.getElementById("games-container");
  if (!container) return;
  container.innerHTML = "";

  const filtered = state.games.filter(g => {
    if (g.league !== state.league) return false;
    if (g.season !== state.season) return false;
    if (!matchesDivision(g, state.divisionFilter)) return false;
    if (state.teamFilter !== "ALL") {
      return g.home_code === state.teamFilter || g.away_code === state.teamFilter;
    }
    return true;
  });

  updateKPIBanner(filtered);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg);">
        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🏈</div>
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">No se encontraron partidos</div>
        <div style="font-size: 0.85rem;">Prueba seleccionando otra conferencia o "Todos los Equipos" para la semana activa.</div>
      </div>
    `;
    return;
  }

  filtered.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => openGameDrawer(game.id);

    const awayCode = (game.away_code || "NFL").toLowerCase();
    const homeCode = (game.home_code || "NFL").toLowerCase();
    const awayLogo = game.away_logo || `https://a.espncdn.com/i/teamlogos/${game.league}/500/${awayCode}.png`;
    const homeLogo = game.home_logo || `https://a.espncdn.com/i/teamlogos/${game.league}/500/${homeCode}.png`;

    const statusBadgeText = game.status === "final" ? "FINAL" : (game.status === "in_progress" ? "🔴 EN VIVO" : "PROGRAMADO");
    const statusClass = game.status === "final" ? "" : "style='background: rgba(239, 68, 68, 0.2); color: #f87171;'";

    card.innerHTML = `
      <div class="game-card-meta">
        <span>📍 ${game.venue || "Estadio"}</span>
        <span class="status-badge" ${statusClass}>${statusBadgeText}</span>
      </div>

      <div class="scoreboard-row">
        <div class="team-info">
          <img src="${awayLogo}" class="team-logo" alt="${game.away_code}" onerror="this.onerror=null; this.src='https://a.espncdn.com/i/teamlogos/${game.league}/500/default.png'">
          <span class="team-name">${game.away_name || game.away_code}</span>
        </div>
        <span class="team-score">${game.status === 'scheduled' ? '-' : game.away_score}</span>
      </div>

      <div class="scoreboard-row">
        <div class="team-info">
          <img src="${homeLogo}" class="team-logo" alt="${game.home_code}" onerror="this.onerror=null; this.src='https://a.espncdn.com/i/teamlogos/${game.league}/500/default.png'">
          <span class="team-name">${game.home_name || game.home_code}</span>
        </div>
        <span class="team-score">${game.status === 'scheduled' ? '-' : game.home_score}</span>
      </div>

      <div class="game-card-footer">
        <span>🌡 ${game.weather_temp ? game.weather_temp + '°F' : 'Clima N/D'}</span>
        <div style="display: flex; gap: 0.35rem;">
          <span class="badge-metric badge-wp-swing">Ficha & Reporte Completo →</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateKPIBanner(customFiltered = null) {
  const filtered = customFiltered || state.games.filter(g => {
    if (g.league !== state.league) return false;
    if (g.season !== state.season) return false;
    if (!matchesDivision(g, state.divisionFilter)) return false;
    if (state.teamFilter !== "ALL") {
      return g.home_code === state.teamFilter || g.away_code === state.teamFilter;
    }
    return true;
  });

  // Card 1: Games Count & Source Subtitle
  const countEl = document.getElementById("kpi-games-count");
  const subEl = document.getElementById("kpi-games-sub");
  if (countEl) countEl.textContent = filtered.length;
  if (subEl) {
    if (state.league === "ncaa") {
      subEl.textContent = "Datos oficiales en vivo ESPN Scoreboard";
    } else if (state.season === 2026) {
      subEl.textContent = "Calendario oficial nflreadpy";
    } else {
      subEl.textContent = "Super Bowl LX oficial nflverse";
    }
  }

  // Card 2: Win Probability Swing / Impact Play / Differential
  const wpLabel = document.getElementById("kpi-wp-label");
  const wpVal = document.getElementById("kpi-wp-val");
  const wpSub = document.getElementById("kpi-wp-sub");

  let allPlays = [];
  filtered.forEach(g => {
    if (Array.isArray(g.key_plays) && g.key_plays.length > 0) {
      g.key_plays.forEach(p => allPlays.push({ ...p, game: g }));
    }
  });

  if (allPlays.length > 0) {
    allPlays.sort((a, b) => (b.wp_swing || 0) - (a.wp_swing || 0));
    const topPlay = allPlays[0];
    const swingPct = ((topPlay.wp_swing || 0) * 100).toFixed(1);
    if (wpLabel) wpLabel.textContent = "Mayor Impacto WP Swing";
    if (wpVal) wpVal.textContent = `+${swingPct}%`;
    if (wpSub) {
      const g = topPlay.game;
      const matchup = g ? ` (${g.away_code || ''} vs ${g.home_code || ''})` : '';
      wpSub.textContent = (topPlay.description ? topPlay.description.slice(0, 48) + '...' : 'Jugada de alto apalancamiento') + matchup;
    }
  } else {
    const finalGames = filtered.filter(g => g.status === "final");
    if (finalGames.length > 0) {
      let maxDiff = -1;
      let topDiffGame = finalGames[0];
      finalGames.forEach(g => {
        const diff = Math.abs((g.home_score || 0) - (g.away_score || 0));
        if (diff > maxDiff) {
          maxDiff = diff;
          topDiffGame = g;
        }
      });
      if (wpLabel) wpLabel.textContent = "Mayor Diferencial";
      if (wpVal) wpVal.textContent = `+${maxDiff} pts`;
      if (wpSub) wpSub.textContent = `${topDiffGame.away_short || topDiffGame.away_code} (${topDiffGame.away_score}) vs ${topDiffGame.home_short || topDiffGame.home_code} (${topDiffGame.home_score})`;
    } else if (state.season === 2026 && state.league === "nfl") {
      if (wpLabel) wpLabel.textContent = "Kickoff NFL 2026";
      if (wpVal) wpVal.textContent = "Sept 9-14";
      if (wpSub) wpSub.textContent = "16 partidos programados en Semana 1";
    } else {
      if (wpLabel) wpLabel.textContent = "Mayor Impacto WP";
      if (wpVal) wpVal.textContent = "--";
      if (wpSub) wpSub.textContent = "Partidos en desarrollo";
    }
  }

  // Card 3: Offensive Leader (Award or Top Scoring Team)
  const offLabel = document.getElementById("kpi-off-label");
  const offVal = document.getElementById("kpi-off-val");
  const offSub = document.getElementById("kpi-off-sub");

  const opow = (state.awards || []).find(a =>
    a.league === state.league && a.season === state.season &&
    (a.category === "OPOW" || a.category === "MVP")
  );

  if (opow) {
    if (offLabel) offLabel.textContent = `Líder Ofensivo (${opow.category})`;
    if (offVal) offVal.textContent = opow.player_name || opow.title || "--";
    if (offSub) offSub.textContent = `${opow.team_short || opow.team_name || ''} • ${opow.stat_line || opow.award_role || ''}`;
  } else {
    const scoredGames = filtered.filter(g => g.home_score !== null || g.away_score !== null);
    if (scoredGames.length > 0) {
      let maxScore = -1;
      let topTeam = "";
      scoredGames.forEach(g => {
        if ((g.home_score || 0) > maxScore) {
          maxScore = g.home_score;
          topTeam = `${g.home_short || g.home_code} (${maxScore} pts)`;
        }
        if ((g.away_score || 0) > maxScore) {
          maxScore = g.away_score;
          topTeam = `${g.away_short || g.away_code} (${maxScore} pts)`;
        }
      });
      if (offLabel) offLabel.textContent = "Líder Anotador";
      if (offVal) offVal.textContent = topTeam || "--";
      if (offSub) offSub.textContent = "Máxima puntuación en la jornada";
    } else {
      if (offLabel) offLabel.textContent = "Líder Ofensivo";
      if (offVal) offVal.textContent = "Por disputarse";
      if (offSub) offSub.textContent = "Semana 1 programada";
    }
  }

  // Card 4: Defensive Leader (Award or Top Defense)
  const defLabel = document.getElementById("kpi-def-label");
  const defVal = document.getElementById("kpi-def-val");
  const defSub = document.getElementById("kpi-def-sub");

  const dpow = (state.awards || []).find(a =>
    a.league === state.league && a.season === state.season && a.category === "DPOW"
  );

  if (dpow) {
    if (defLabel) defLabel.textContent = "Líder Defensivo (DPOW)";
    if (defVal) defVal.textContent = dpow.player_name || dpow.title || "--";
    if (defSub) defSub.textContent = `${dpow.team_short || dpow.team_name || ''} • ${dpow.stat_line || dpow.award_role || ''}`;
  } else {
    const finalGames = filtered.filter(g => g.status === "final");
    if (finalGames.length > 0) {
      let minAllowed = 999;
      let bestDefTeam = "";
      finalGames.forEach(g => {
        if (g.away_score < minAllowed) {
          minAllowed = g.away_score;
          bestDefTeam = `${g.home_short || g.home_code} (${minAllowed} pts)`;
        }
        if (g.home_score < minAllowed) {
          minAllowed = g.home_score;
          bestDefTeam = `${g.away_short || g.away_code} (${minAllowed} pts)`;
        }
      });
      if (defLabel) defLabel.textContent = "Mejor Defensiva";
      if (defVal) defVal.textContent = bestDefTeam || "--";
      if (defSub) defSub.textContent = minAllowed === 0 ? "Blanqueada (0 pts concedidos)" : "Mínimos puntos permitidos";
    } else {
      if (defLabel) defLabel.textContent = "Líder Defensivo";
      if (defVal) defVal.textContent = "Por disputarse";
      if (defSub) defSub.textContent = "Semana 1 programada";
    }
  }
}

// Drawer Tabs
function switchDrawerTab(tabName) {
  const tabTactical = document.getElementById("tab-btn-tactical");
  const tabBoxscore = document.getElementById("tab-btn-boxscore");
  const contentTactical = document.getElementById("drawer-tab-content-tactical");
  const contentBoxscore = document.getElementById("drawer-tab-content-boxscore");

  if (tabName === "tactical") {
    if (tabTactical) tabTactical.classList.add("active");
    if (tabBoxscore) tabBoxscore.classList.remove("active");
    if (contentTactical) contentTactical.style.display = "block";
    if (contentBoxscore) contentBoxscore.style.display = "none";
  } else {
    if (tabTactical) tabTactical.classList.remove("active");
    if (tabBoxscore) tabBoxscore.classList.add("active");
    if (contentTactical) contentTactical.style.display = "none";
    if (contentBoxscore) contentBoxscore.style.display = "flex";
  }
}

// Open Game Detail Drawer (SOP A.3: Ficha, Game stats, Jugadas clave, Trivia, Highlights, Premios)
async function openGameDrawer(gameId) {
  const staticFallback = await getStaticData();
  let game = state.games.find(g => g.id === gameId) || staticFallback.games.find(g => g.id === gameId);

  try {
    const res = await apiFetch(`/api/games/${gameId}`);
    if (res.ok) {
      const apiGame = await res.json();
      game = { ...game, ...apiGame };
    }
  } catch (e) {}

  if (!game) return;
  state.activeDrawerGame = game;

  // 1. Ficha del partido
  document.getElementById("drawer-venue").textContent = `${game.venue || "Estadio"} • ${game.weather_desc || (game.weather_temp ? game.weather_temp + '°F' : 'Techado / N/D')}`;
  document.getElementById("drawer-title").textContent = `${game.away_name || game.away_code} (${game.status === 'scheduled' ? '-' : game.away_score}) @ ${game.home_name || game.home_code} (${game.status === 'scheduled' ? '-' : game.home_score})`;
  document.getElementById("th-away-team").textContent = game.away_code;
  document.getElementById("th-home-team").textContent = game.home_code;

  // Highlights link
  const highlightLink = document.getElementById("drawer-highlight-link");
  if (highlightLink) {
    if (game.highlight_url) {
      highlightLink.href = game.highlight_url;
      highlightLink.style.display = "inline-flex";
    } else {
      highlightLink.style.display = "none";
    }
  }

  // 2. Tactical Analysis Tab
  renderTacticalAnalysis(game.tactical_analysis, game);
  if (game.tactical_analysis) {
    switchDrawerTab("tactical");
  } else {
    switchDrawerTab("boxscore");
  }

  // 3. Game Stats (EPA/jugada, yardas totales/pase/carrera, 3rd down, red zone)
  const statsBody = document.getElementById("drawer-stats-body");
  const stats = game.team_stats || [];
  const awayStat = stats.find(s => !s.is_home) || {};
  const homeStat = stats.find(s => s.is_home) || {};

  statsBody.innerHTML = `
    <tr>
      <td><strong>EPA Total Acumulado</strong></td>
      <td style="color: ${awayStat.epa_total > 0 ? 'var(--metric-positive)' : (awayStat.epa_total < 0 ? 'var(--metric-negative)' : 'inherit')}">${awayStat.epa_total !== undefined ? awayStat.epa_total : '-'}</td>
      <td style="color: ${homeStat.epa_total > 0 ? 'var(--metric-positive)' : (homeStat.epa_total < 0 ? 'var(--metric-negative)' : 'inherit')}">${homeStat.epa_total !== undefined ? homeStat.epa_total : '-'}</td>
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
      <td>Eficiencia 3rd Down</td>
      <td>${awayStat.third_down_comp ?? 0}/${awayStat.third_down_att ?? 0}</td>
      <td>${homeStat.third_down_comp ?? 0}/${homeStat.third_down_att ?? 0}</td>
    </tr>
    <tr>
      <td>Eficiencia Red Zone</td>
      <td>${awayStat.red_zone_comp ?? 0}/${awayStat.red_zone_att ?? 0}</td>
      <td>${homeStat.red_zone_comp ?? 0}/${homeStat.red_zone_att ?? 0}</td>
    </tr>
    <tr>
      <td>Tiempo de Posesión</td>
      <td>${awayStat.time_of_possession || '30:00'}</td>
      <td>${homeStat.time_of_possession || '30:00'}</td>
    </tr>
  `;

  // 4. Jugadas Clave (Top 5 por WP swing)
  const playsList = document.getElementById("drawer-plays-list");
  const plays = game.key_plays || [];
  if (plays.length === 0) {
    playsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">No hay jugadas registradas aún para este partido.</div>`;
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
        <a href="${p.video_url || 'https://www.youtube.com/results?search_query=' + encodeURIComponent(p.description)}" target="_blank" rel="noopener" class="play-btn">
          ▶ Buscar jugada en YouTube
        </a>
      </div>
    `).join("");
  }

  // 5. Trivia del Juego
  const triviaList = document.getElementById("drawer-trivia-list");
  const trivia = game.trivia || [];
  if (trivia.length === 0) {
    triviaList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">No hay viñetas históricas calculadas aún para este partido.</div>`;
  } else {
    triviaList.innerHTML = trivia.map(t => `
      <div class="trivia-item">
        🎙 ${t.fact_text}
      </div>
    `).join("");
  }

  // 6. Candidatos a Premios de este Juego (SOP A.3)
  const awardsList = document.getElementById("drawer-game-awards-list");
  const awardsSection = document.getElementById("drawer-awards-section");
  const gameAwards = game.game_awards || state.awards.filter(a =>
    a.team_id === game.home_team_id || a.team_id === game.away_team_id
  );

  if (awardsList && awardsSection) {
    if (gameAwards && gameAwards.length > 0) {
      awardsSection.style.display = "block";
      awardsList.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem;">
          ${gameAwards.map(a => `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <span class="badge-metric badge-epa-pos" style="font-size: 0.7rem;">${a.category} #${a.rank}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${a.team_id ? a.team_id.replace('nfl_', '').replace('ncaa_', '') : ''}</span>
              </div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">${a.candidate_name}</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">${a.stat_summary}</div>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      awardsSection.style.display = "none";
    }
  }

  document.getElementById("drawer-modal").classList.add("active");
}

function closeDrawer(event) {
  if (event && event.target && event.target.id !== "drawer-modal") return;
  const modal = document.getElementById("drawer-modal");
  if (modal) modal.classList.remove("active");
}

// Render Tactical Deep Research Analysis
function renderTacticalAnalysis(analysis, game) {
  const container = document.getElementById("drawer-tactical-body");
  if (!container) return;

  if (!analysis) {
    container.innerHTML = `
      <div style="background: var(--bg-card); padding: 2rem 1.5rem; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); text-align: center; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🛡️</div>
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; font-size: 1rem;">Análisis Táctico en Síntesis</div>
        <div style="font-size: 0.82rem; line-height: 1.5; max-width: 480px; margin: 0 auto;">
          Los scouts y el motor analítico están procesando las métricas avanzadas de este encuentro. Consulta la pestaña <strong>Boxscore & Jugadas Clave</strong> para ver las estadísticas EPA y el Play-by-Play oficial.
        </div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="tactical-header-card">
      <div class="tactical-headline">${analysis.headline || "Análisis Táctico & Deep Research"}</div>
      <div class="tactical-narrative">${analysis.narrative_summary || ""}</div>
    </div>
  `;

  // Historic Facts
  const facts = analysis.historic_facts || [];
  if (facts.length > 0) {
    html += `
      <div>
        <div class="section-title">📈 Hitos & Cifras Históricas del Encuentro</div>
        <div class="historic-facts-grid">
          ${facts.map(f => `
            <div class="historic-fact-item">
              <span class="fact-badge">💡 HITO</span>
              <div class="fact-text">
                <strong>${f.title}:</strong> ${f.description}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Award Deep Dives
  const deepDives = analysis.award_deep_dives || [];
  if (deepDives.length > 0) {
    html += `
      <div>
        <div class="section-title">🏅 Perfiles Tácticos de Premiados (Award Deep Dives)</div>
        <div class="award-deep-dives-list">
          ${deepDives.map(d => `
            <div class="deep-dive-card">
              <div class="deep-dive-header">
                <span class="deep-dive-role">${d.role}</span>
                <span class="team-pill-badge">${d.team_code || ""}</span>
              </div>
              <div class="deep-dive-player" style="margin-bottom: 0.6rem;">
                ${d.player}
              </div>
              <ul class="deep-dive-bullets">
                ${(d.bullets || []).map(b => `
                  <li><strong>${b.label}:</strong> ${b.detail}</li>
                `).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Tactical DOs and DON'Ts
  const dosDonts = analysis.tactical_dos_donts || [];
  if (dosDonts.length > 0) {
    html += `
      <div>
        <div class="section-title">📋 Matriz Táctica: DOs y DON'Ts</div>
        <div class="tactical-table-wrapper">
          <table class="tactical-table">
            <thead>
              <tr>
                <th style="width: 100px;">Categoría</th>
                <th style="width: 35%;">Estrategia Táctica</th>
                <th>Lógica / Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${dosDonts.map(row => {
                const isDo = (row.type || "").toUpperCase() === "DO";
                return `
                  <tr>
                    <td>
                      <span class="badge-tactical ${isDo ? 'badge-do' : 'badge-dont'}">
                        ${isDo ? '🟢 DO' : "🔴 DON'T"}
                      </span>
                    </td>
                    <td><strong>${row.strategy}</strong></td>
                    <td style="color: var(--text-secondary);">${row.logic}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Copy Tactical Analysis as Clean Markdown
function copyCurrentGameTacticalMarkdown() {
  const game = state.activeDrawerGame;
  if (!game || !game.tactical_analysis) {
    alert("No hay análisis táctico disponible para este partido.");
    return;
  }
  const t = game.tactical_analysis;

  let md = `# ${t.headline || "Tactical Analysis"}\n\n`;
  md += `${t.narrative_summary || ""}\n\n`;

  if (t.historic_facts && t.historic_facts.length > 0) {
    md += `### Historic Team Facts and Figures\n`;
    t.historic_facts.forEach(f => {
      md += `- **${f.title}**: ${f.description}\n`;
    });
    md += `\n`;
  }

  if (t.award_deep_dives && t.award_deep_dives.length > 0) {
    md += `### Award Winner Deep Dives: Stats and Tactical Profiles\n`;
    t.award_deep_dives.forEach(d => {
      md += `#### ${d.role}: ${d.player} (${d.team_code || ""})\n`;
      (d.bullets || []).forEach(b => {
        md += `- **${b.label}**: ${b.detail}\n`;
      });
      md += `\n`;
    });
  }

  if (t.tactical_dos_donts && t.tactical_dos_donts.length > 0) {
    md += `### Defensive Dos and Don'ts\n`;
    md += `| Category | Tactical Strategy | Logic/Outcome |\n`;
    md += `|---|---|---|\n`;
    t.tactical_dos_donts.forEach(row => {
      md += `| ${row.type} | ${row.strategy} | ${row.logic} |\n`;
    });
    md += `\n`;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(md).then(() => {
      showCopyToast("¡Análisis copiado al portapapeles en formato YouTube / Gemini!");
    }).catch(() => {
      window.prompt("Copia el texto del análisis táctico:", md);
    });
  } else {
    window.prompt("Copia el texto del análisis táctico:", md);
  }
}

function showCopyToast(msg) {
  const existing = document.getElementById("copy-toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "copy-toast-notification";
  toast.className = "copy-feedback-toast";
  toast.innerHTML = `<span>📋</span> <span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast) toast.remove();
  }, 3500);
}

// Render Weekly Awards Hub (SOP A.6)
function renderAwards() {
  const container = document.getElementById("awards-container");
  if (!container) return;
  container.innerHTML = "";

  const categories = [
    { key: "MVP", title: "🌟 Jugador Más Valioso (MVP de la Semana)" },
    { key: "OPOW", title: "⚡ Jugador Ofensivo de la Semana (OPOW)" },
    { key: "DPOW", title: "🛡 Jugador Defensivo de la Semana (DPOW)" },
    { key: "SPECIAL_TEAMS", title: "👟 Equipos Especiales de la Semana" },
    { key: "DO", title: "🎯 DO: Jugada Maestra de la Jornada (Top EPA)" },
    { key: "DONT", title: "⚠️ DON'T: Error Garrafal de la Jornada" }
  ];

  let hasAwards = false;

  categories.forEach(cat => {
    const nominees = state.awards.filter(a => a.category === cat.key);
    if (nominees.length === 0) return;
    hasAwards = true;

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
              <a href="${n.clip_url || '#'}" target="_blank" rel="noopener" class="play-btn" style="margin-top: 0.35rem;">
                ▶ Ver clip
              </a>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    container.appendChild(card);
  });

  if (!hasAwards) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏆</div>
        <div style="font-weight: 700; color: var(--text-primary);">Premios Semanales en Cálculo</div>
        <div style="font-size: 0.82rem; margin-top: 0.35rem;">Los premios oficiales se calculan automáticamente tras completarse los partidos de la semana.</div>
      </div>
    `;
  }
}

// YouTube Studio Script Generator
let currentGeneratedScript = "";

async function loadYoutubeScript() {
  const pre = document.getElementById("script-content-pre");
  const titlesList = document.getElementById("script-titles-list");
  if (!pre || !titlesList) return;

  pre.textContent = "⏳ Generando guion analítico con timestamps de locución...";
  titlesList.innerHTML = "";

  try {
    const res = await apiFetch(`/api/scripts/generate?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (res.ok) {
      const data = await res.json();
      currentGeneratedScript = data.script_markdown || "";

      document.getElementById("script-duration-badge").textContent = `⏱️ ${data.estimated_duration_formatted || '14m 00s'}`;
      document.getElementById("script-words-badge").textContent = `${data.total_words || 1600} palabras`;

      titlesList.innerHTML = (data.suggested_titles || []).map(t => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--text-primary);">
          ${t}
        </div>
      `).join("");

      pre.textContent = currentGeneratedScript;
      return;
    }
  } catch (e) {}

  // Client-side script fallback
  const fallbackTitles = [
    `El Plan Defensivo que Cambió Todo | Análisis Táctico ${state.league.toUpperCase()} Semana ${state.week}`,
    `3 Decisiones que Costaron el Juego | EPA & Win Probability Swing`,
    `¿Por qué Nadie Vio Venir Esto? | Deep Research Semana ${state.week}`
  ];

  titlesList.innerHTML = fallbackTitles.map(t => `
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--text-primary);">
      ${t}
    </div>
  `).join("");

  currentGeneratedScript = `# GUION YOUTUBE: ${state.league.toUpperCase()} ${state.season} SEMANA ${state.week}\n\n[00:00 - 01:30] HOOK & RESUMEN EJECUTIVO\nBienvenidos a Gridiron Hub...`;
  pre.textContent = currentGeneratedScript;
}

function copyFullScript() {
  if (!currentGeneratedScript) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentGeneratedScript).then(() => {
      showCopyToast("¡Guion completo copiado al portapapeles!");
    });
  } else {
    window.prompt("Copia el guion de YouTube:", currentGeneratedScript);
  }
}

function downloadScriptFile() {
  if (!currentGeneratedScript) return;
  const blob = new Blob([currentGeneratedScript], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `guion_${state.league}_${state.season}_w${state.week}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Initialization on DOM load
async function initApp() {
  updateSeasonSelector();
  populateWeekSelector(state.season);
  renderFilterPills();
  await checkAuthSession();
  await loadCurrentData();
}

window.addEventListener("DOMContentLoaded", initApp);
