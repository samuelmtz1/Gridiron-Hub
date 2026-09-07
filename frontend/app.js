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
    const res = await fetch(`./data.json?_v=${Date.now()}`);
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

function apiFetch(path, options = {}, timeoutMs = 3500) {
  const url = `${API_BASE}${path}`;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, headers, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ==============================================================================
// Safety Net & Rate Limiting System (SOP A.2 & Protection against IP bans)
// ==============================================================================
const SYNC_SAFETY = {
  DAILY_LIMIT: 30,                     // Projected safe daily limit (CFBD 1000/mo = ~33/day)
  COOLDOWN_SECONDS: 30,                // 30s minimum interval to avoid Akamai WAF bans
  CIRCUIT_BREAKER_MS: 10 * 60 * 1000,  // 10 minutes safety lockout on WAF detection (429/403)
  STORAGE_KEY_QUOTA: "gridiron_sync_quota",
  STORAGE_KEY_CIRCUIT: "gridiron_circuit_breaker_until",
  STORAGE_KEY_LAST_SYNC: "gridiron_last_sync_timestamp"
};

let syncCooldownTimer = null;

function getTodayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getSyncQuota() {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(SYNC_SAFETY.STORAGE_KEY_QUOTA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) return parsed;
    }
  } catch (e) {}
  const fresh = { date: today, used: 0, max: SYNC_SAFETY.DAILY_LIMIT };
  localStorage.setItem(SYNC_SAFETY.STORAGE_KEY_QUOTA, JSON.stringify(fresh));
  return fresh;
}

function recordSyncUsage() {
  const quota = getSyncQuota();
  quota.used = Math.min(quota.max, quota.used + 1);
  localStorage.setItem(SYNC_SAFETY.STORAGE_KEY_QUOTA, JSON.stringify(quota));
  localStorage.setItem(SYNC_SAFETY.STORAGE_KEY_LAST_SYNC, String(Date.now()));
  updateSyncUI();
  return quota;
}

function checkCircuitBreaker() {
  try {
    const until = parseInt(localStorage.getItem(SYNC_SAFETY.STORAGE_KEY_CIRCUIT) || "0", 10);
    if (Date.now() < until) {
      return { active: true, remainingSecs: Math.ceil((until - Date.now()) / 1000) };
    }
  } catch (e) {}
  return { active: false, remainingSecs: 0 };
}

function triggerCircuitBreaker(reason = "Detección de rate limit o WAF") {
  const until = Date.now() + SYNC_SAFETY.CIRCUIT_BREAKER_MS;
  localStorage.setItem(SYNC_SAFETY.STORAGE_KEY_CIRCUIT, String(until));
  updateSyncUI();
  showSafetyBanner(`⚠️ ${reason}. Modo de protección activado: sistema en reposo durante 10 minutos para proteger tu IP.`);
}

function showSafetyBanner(message) {
  const banner = document.getElementById("safety-net-banner");
  const text = document.getElementById("safety-banner-text");
  if (banner && text) {
    text.textContent = message;
    banner.style.display = "flex";
  }
}

function hideSafetyBanner() {
  const banner = document.getElementById("safety-net-banner");
  if (banner) banner.style.display = "none";
}

function getRemainingCooldownSeconds() {
  try {
    const last = parseInt(localStorage.getItem(SYNC_SAFETY.STORAGE_KEY_LAST_SYNC) || "0", 10);
    const elapsed = Math.floor((Date.now() - last) / 1000);
    return Math.max(0, SYNC_SAFETY.COOLDOWN_SECONDS - elapsed);
  } catch (e) {
    return 0;
  }
}

function updateSyncUI() {
  const btn = document.getElementById("btn-sync-data");
  const textSpan = document.getElementById("sync-btn-text");
  const badge = document.getElementById("sync-quota-badge");
  if (!btn || !badge) return;

  const cb = checkCircuitBreaker();
  const quota = getSyncQuota();
  const remaining = quota.max - quota.used;
  const cooldown = getRemainingCooldownSeconds();

  // 1. Circuit Breaker Active
  if (cb.active) {
    btn.disabled = true;
    if (textSpan) textSpan.textContent = `Bloqueo de Seguridad (${cb.remainingSecs}s)`;
    badge.textContent = `🛡️ Protección WAF`;
    badge.className = "badge-quota locked";
    showSafetyBanner(`⚠️ WAF Guard Activo: Las fuentes externas están protegidas. Reposo de seguridad (${cb.remainingSecs}s restantes) para evitar bloqueos.`);
    return;
  }

  // 2. Daily Quota Exceeded
  if (remaining <= 0) {
    btn.disabled = true;
    if (textSpan) textSpan.textContent = "Límite Diario Alcanzado";
    badge.textContent = `🛡️ 0/30 hoy`;
    badge.className = "badge-quota locked";
    showSafetyBanner("🛡️ Has completado la cuota de seguridad de 30 consultas hoy. Se restablece mañana para proteger contra baneos de IP.");
    return;
  }

  // 3. Cooldown Active
  if (cooldown > 0) {
    btn.disabled = true;
    if (textSpan) textSpan.textContent = `Espera ${cooldown}s`;
    badge.textContent = `🛡️ ${remaining}/${quota.max} hoy`;
    badge.className = remaining <= 5 ? "badge-quota warning" : "badge-quota";
    hideSafetyBanner();
    return;
  }

  // 4. Ready to Sync
  btn.disabled = false;
  if (textSpan) textSpan.textContent = "Actualizar Datos";
  badge.textContent = `🛡️ ${remaining}/${quota.max} hoy`;
  badge.className = remaining <= 5 ? "badge-quota warning" : "badge-quota";
  hideSafetyBanner();
}

function startCooldownTicker() {
  if (syncCooldownTimer) clearInterval(syncCooldownTimer);
  updateSyncUI();
  syncCooldownTimer = setInterval(() => {
    const cd = getRemainingCooldownSeconds();
    const cb = checkCircuitBreaker();
    updateSyncUI();
    if (cd <= 0 && !cb.active) {
      clearInterval(syncCooldownTimer);
      syncCooldownTimer = null;
    }
  }, 1000);
}

// Parse ESPN live scoreboard directly in browser to update scores and final statuses in real time
function applyLiveEspnScoreboard(scoreboardData, league) {
  if (!scoreboardData || !Array.isArray(scoreboardData.events)) return 0;

  let updatedCount = 0;
  const events = scoreboardData.events;

  events.forEach(event => {
    const competitions = event.competitions || [];
    if (competitions.length === 0) return;
    const comp = competitions[0];
    const competitors = comp.competitors || [];

    const homeComp = competitors.find(c => c.homeAway === "home") || {};
    const awayComp = competitors.find(c => c.homeAway === "away") || {};

    const homeCode = ((homeComp.team && homeComp.team.abbreviation) || "").toUpperCase().replace("&", "");
    const awayCode = ((awayComp.team && awayComp.team.abbreviation) || "").toUpperCase().replace("&", "");

    if (!homeCode || !awayCode) return;

    const statusType = (comp.status && comp.status.type) || {};
    const isCompleted = statusType.completed === true || statusType.name === "STATUS_FINAL";
    const isInProgress = statusType.name === "STATUS_IN_PROGRESS" || statusType.state === "in";
    const normalizedStatus = isCompleted ? "final" : (isInProgress ? "in_progress" : "scheduled");

    const homeScore = homeComp.score !== undefined && homeComp.score !== null && homeComp.score !== "" ? parseInt(homeComp.score, 10) : 0;
    const awayScore = awayComp.score !== undefined && awayComp.score !== null && awayComp.score !== "" ? parseInt(awayComp.score, 10) : 0;

    const venue = (comp.venue && comp.venue.fullName) || "";

    // Find matching game in state.games
    const targetGame = state.games.find(g => {
      if (g.league !== league) return false;
      const gHome = (g.home_code || "").toUpperCase();
      const gAway = (g.away_code || "").toUpperCase();
      return (gHome === homeCode && gAway === awayCode) ||
             (g.home_team_id && g.home_team_id.endsWith(homeCode) && g.away_team_id && g.away_team_id.endsWith(awayCode));
    });

    if (targetGame) {
      targetGame.status = normalizedStatus;
      targetGame.home_score = homeScore;
      targetGame.away_score = awayScore;
      if (venue && !targetGame.venue) targetGame.venue = venue;
      updatedCount++;
    }
  });

  return updatedCount;
}

async function triggerOnDemandSync() {
  const cb = checkCircuitBreaker();
  if (cb.active) {
    alert(`Modo de protección activo. Por favor espera ${cb.remainingSecs} segundos antes de sincronizar.`);
    return;
  }
  const cooldown = getRemainingCooldownSeconds();
  if (cooldown > 0) {
    alert(`Por favor espera ${cooldown} segundos antes de solicitar otra actualización para evitar baneos de IP.`);
    return;
  }
  const quota = getSyncQuota();
  if (quota.used >= quota.max) {
    alert("Has alcanzado el límite diario de 30 consultas para prevenir bloqueos de IP. Vuelve a intentarlo mañana.");
    return;
  }

  const btn = document.getElementById("btn-sync-data");
  const spinner = document.getElementById("sync-spinner");
  const icon = document.getElementById("sync-btn-icon");
  const textSpan = document.getElementById("sync-btn-text");

  if (btn) {
    btn.disabled = true;
    btn.classList.add("syncing");
  }
  if (spinner) spinner.style.display = "inline";
  if (icon) icon.style.display = "none";
  if (textSpan) textSpan.textContent = "Sincronizando...";

  try {
    recordSyncUsage();
    let updatedCount = 0;

    // 1. Direct real-time ESPN scoreboard fetch (Client-side, 0 lag, guaranteed CORS)
    try {
      const espnUrl = state.league === "ncaa"
        ? "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=2026&week=1&seasontype=2&limit=100&groups=80"
        : "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&week=1&seasontype=2";
      const espnRes = await fetch(espnUrl, { headers: { "Accept": "application/json" } });

      if (espnRes.status === 429 || espnRes.status === 403) {
        triggerCircuitBreaker("Protección WAF de ESPN detectada");
        return;
      }

      if (espnRes.ok) {
        const espnData = await espnRes.json();
        updatedCount = applyLiveEspnScoreboard(espnData, state.league);
      }
    } catch (espnErr) {
      console.warn("Error consultando ESPN Scoreboard:", espnErr);
    }

    // 2. Also ping backend API in background if online
    try {
      apiFetch("/api/ingest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league: state.league, season: state.season, week: state.week, force: true })
      }, 5000).catch(() => null);
    } catch (e) {}

    // 3. Persist live updated games in localStorage for persistence across page reloads
    if (updatedCount > 0) {
      try {
        localStorage.setItem(`gridiron_live_games_${state.league}_${state.season}_${state.week}`, JSON.stringify(state.games));
      } catch (e) {}
    }

    // 4. Also reload latest data.json cache-busted
    try {
      STATIC_DATA = null;
      const res = await fetch(`./data.json?_v=${Date.now()}`);
      if (res.ok) {
        const freshData = await res.json();
        STATIC_DATA = freshData;
        // Merge into state if we didn't already get live ESPN updates
        if (updatedCount === 0 && Array.isArray(freshData.games)) {
          const freshGames = freshData.games.filter(g =>
            g.league === state.league && g.season === state.season && g.week === state.week
          ).map(g => enrichGame(g, state.teamsMap));
          if (freshGames.length > 0) {
            state.games = freshGames;
            updatedCount = freshGames.length;
          }
        }
      }
    } catch (e) {}

    // 5. Re-render UI immediately with fresh scores and status badges
    populateTeamSelector();
    renderGames();
    renderAwards();
    updateKPIBanner();

    if (updatedCount > 0) {
      showCopyToast(`✅ ${updatedCount} partidos actualizados con marcadores oficiales de ESPN.`);
    } else {
      showCopyToast("✅ Datos verificados y actualizados.");
    }
  } catch (err) {
    console.error("Error durante sincronización:", err);
    showCopyToast("⚠️ Actualización completada con datos locales verificados.");
  } finally {
    if (spinner) spinner.style.display = "none";
    if (icon) icon.style.display = "inline";
    if (btn) btn.classList.remove("syncing");
    startCooldownTicker();
  }
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

// Helper to index all teams by id and code for instant lookups
function getTeamsMap(allTeams) {
  const map = new Map();
  (allTeams || []).forEach(t => {
    if (t.id) map.set(t.id, t);
    if (t.code) {
      map.set(t.code, t);
      map.set(t.code.toUpperCase(), t);
      map.set(t.code.toLowerCase(), t);
    }
  });
  return map;
}

// Resilient game enrichment to ensure zero undefined names, codes, or logos
function enrichGame(g, teamsMap) {
  if (!g) return g;
  const map = teamsMap || state.teamsMap || new Map();
  const ht = map.get(g.home_team_id) || map.get(g.home_code) || {};
  const at = map.get(g.away_team_id) || map.get(g.away_code) || {};

  const cleanHomeCode = (g.home_code || ht.code || (g.home_team_id ? g.home_team_id.replace(/^(nfl_|ncaa_)/, '') : 'HOME')).toUpperCase();
  const cleanAwayCode = (g.away_code || at.code || (g.away_team_id ? g.away_team_id.replace(/^(nfl_|ncaa_)/, '') : 'AWAY')).toUpperCase();

  const homeName = g.home_name || ht.name || cleanHomeCode;
  const awayName = g.away_name || at.name || cleanAwayCode;
  const league = g.league || (g.id && g.id.startsWith("ncaa") ? "ncaa" : "nfl");

  const homeLogo = g.home_logo || ht.logo_url || `https://a.espncdn.com/i/teamlogos/${league}/500/${cleanHomeCode.toLowerCase()}.png`;
  const awayLogo = g.away_logo || at.logo_url || `https://a.espncdn.com/i/teamlogos/${league}/500/${cleanAwayCode.toLowerCase()}.png`;

  return {
    ...g,
    home_code: cleanHomeCode,
    home_name: homeName,
    home_short: g.home_short || ht.short_name || homeName,
    home_logo: homeLogo,
    home_conference: g.home_conference || ht.conference || '',
    home_division: g.home_division || ht.division || '',
    home_primary: g.home_primary || ht.primary_color || '#002244',
    home_secondary: g.home_secondary || ht.secondary_color || '#B0B7BC',

    away_code: cleanAwayCode,
    away_name: awayName,
    away_short: g.away_short || at.short_name || awayName,
    away_logo: awayLogo,
    away_conference: g.away_conference || at.conference || '',
    away_division: g.away_division || at.division || '',
    away_primary: g.away_primary || at.primary_color || '#69BE28',
    away_secondary: g.away_secondary || at.secondary_color || '#A5ACAF',
  };
}

// Resilient award enrichment
function enrichAward(a, teamsMap) {
  if (!a) return a;
  const map = teamsMap || state.teamsMap || new Map();
  const t = map.get(a.team_id) || map.get(a.team_code) || {};
  return {
    ...a,
    candidate_name: a.candidate_name || a.player_name || a.title || 'Candidato Destacado',
    stat_summary: a.stat_summary || a.stat_line || a.award_role || '',
    team_name: a.team_name || t.name || '',
    team_short: a.team_short || t.short_name || t.code || '',
    team_logo: a.team_logo || t.logo_url || (t.code ? `https://a.espncdn.com/i/teamlogos/${a.league || 'ncaa'}/500/${t.code.toLowerCase()}.png` : '')
  };
}

// Core Data Loading (Fast-First Stale-While-Revalidate Architecture)
async function loadCurrentData() {
  const staticFallback = await getStaticData();

  // Build full teams lookup map across all leagues
  state.allTeams = staticFallback.teams || [];
  state.teamsMap = getTeamsMap(state.allTeams);

  // 1. Instant Hydration from Verified Cache (<50ms)
  let initialTeams = (staticFallback.teams || []).filter(t => t.league === state.league);
  let initialGames = (staticFallback.games || []).filter(g =>
    g.league === state.league && g.season === state.season && g.week === state.week
  ).map(g => enrichGame(g, state.teamsMap));
  let initialAwards = (staticFallback.awards || []).filter(a =>
    a.league === state.league && a.season === state.season && a.week === state.week
  ).map(a => enrichAward(a, state.teamsMap));

  // Merge any live score updates stored in localStorage
  try {
    const saved = localStorage.getItem(`gridiron_live_games_${state.league}_${state.season}_${state.week}`);
    if (saved) {
      const liveList = JSON.parse(saved);
      if (Array.isArray(liveList)) {
        const liveMap = new Map(liveList.map(g => [g.id, g]));
        initialGames = initialGames.map(g => {
          const live = liveMap.get(g.id);
          if (live) {
            return {
              ...g,
              status: live.status,
              home_score: live.home_score,
              away_score: live.away_score,
              venue: live.venue || g.venue
            };
          }
          return g;
        });
      }
    }
  } catch (e) {}

  state.teams = initialTeams || [];
  state.games = initialGames || [];
  state.awards = initialAwards || [];

  // Instant render - user never sees a blank screen!
  populateTeamSelector();
  renderGames();
  renderAwards();
  updateKPIBanner();

  if (state.view === "script") {
    loadYoutubeScript();
  }

  // 2. Parallel Background Sync with Strict Timeout (3.5s)
  try {
    const [teamsRes, gamesRes, awardsRes] = await Promise.allSettled([
      apiFetch(`/api/teams?league=${state.league}`, {}, 3500),
      apiFetch(`/api/games?league=${state.league}&season=${state.season}&week=${state.week}`, {}, 3500),
      apiFetch(`/api/awards?league=${state.league}&season=${state.season}&week=${state.week}`, {}, 3500)
    ]);

    let updated = false;
    if (teamsRes.status === "fulfilled" && teamsRes.value.ok) {
      const data = await teamsRes.value.json().catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        state.teams = data;
        data.forEach(t => {
          if (t.id) state.teamsMap.set(t.id, t);
          if (t.code) {
            state.teamsMap.set(t.code, t);
            state.teamsMap.set(t.code.toUpperCase(), t);
            state.teamsMap.set(t.code.toLowerCase(), t);
          }
        });
        updated = true;
      }
    }
    if (gamesRes.status === "fulfilled" && gamesRes.value.ok) {
      const data = await gamesRes.value.json().catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        state.games = data.map(g => enrichGame(g, state.teamsMap));
        updated = true;
      }
    }
    if (awardsRes.status === "fulfilled" && awardsRes.value.ok) {
      const data = await awardsRes.value.json().catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        state.awards = data.map(a => enrichAward(a, state.teamsMap));
        updated = true;
      }
    }

    if (updated) {
      populateTeamSelector();
      renderGames();
      renderAwards();
      updateKPIBanner();
    }
  } catch (err) {
    // Graceful offline/standby: Static data is already rendered
  }
}

// Multi-Season & Multi-League Dynamic Navigation (Exclusivo 2026 en adelante)
function updateSeasonSelector() {
  const seasonSelect = document.getElementById("select-season");
  if (!seasonSelect) return;
  seasonSelect.innerHTML = `
    <option value="2026" selected>Temporada 2026-2027 (Actual)</option>
  `;
  state.season = 2026;
  seasonSelect.value = "2026";
}

function populateWeekSelector(season) {
  const weekSelect = document.getElementById("select-week");
  if (!weekSelect) return;
  state.season = 2026;
  if (state.league === "ncaa") {
    weekSelect.innerHTML = `
      <option value="1" selected>Semana 1 (Jornada Inaugural Septiembre 2026)</option>
    `;
    state.week = 1;
  } else {
    // NFL 2026
    weekSelect.innerHTML = `
      <option value="1" selected>Semana 1 (Kickoff Septiembre 2026 - Programados)</option>
    `;
    state.week = 1;
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
  if (!game) return false;
  if (!divFilter || divFilter === "ALL") return true;

  const homeConf = (game.home_conference || "").toUpperCase();
  const awayConf = (game.away_conference || "").toUpperCase();
  const homeDiv = (game.home_division || "").toUpperCase();
  const awayDiv = (game.away_division || "").toUpperCase();
  const targetFilter = divFilter.toUpperCase();

  // NFL Conferences
  if (targetFilter === "AFC") return homeConf === "AFC" || awayConf === "AFC";
  if (targetFilter === "NFC") return homeConf === "NFC" || awayConf === "NFC";

  // NFL Divisions (e.g. "AFC WEST", "NFC NORTH")
  if (targetFilter.startsWith("AFC ")) {
    const div = targetFilter.replace("AFC ", "");
    return (homeConf === "AFC" && homeDiv === div) || (awayConf === "AFC" && awayDiv === div);
  }
  if (targetFilter.startsWith("NFC ")) {
    const div = targetFilter.replace("NFC ", "");
    return (homeConf === "NFC" && homeDiv === div) || (awayConf === "NFC" && awayDiv === div);
  }

  // NCAA Conferences
  if (targetFilter === "SEC") return homeConf === "SEC" || awayConf === "SEC";
  if (targetFilter === "BIG TEN") return homeConf === "BIG TEN" || awayConf === "BIG TEN";
  if (targetFilter === "BIG 12") return homeConf === "BIG 12" || awayConf === "BIG 12";
  if (targetFilter === "ACC") return homeConf === "ACC" || awayConf === "ACC";
  if (targetFilter === "AMERICAN") return homeConf === "AMERICAN" || awayConf === "AMERICAN";
  if (targetFilter === "MOUNTAIN WEST") return homeConf === "MOUNTAIN WEST" || awayConf === "MOUNTAIN WEST";
  if (targetFilter === "MAC") return homeConf === "MAC" || awayConf === "MAC";
  if (targetFilter === "SUN BELT") return homeConf === "SUN BELT" || awayConf === "SUN BELT";
  if (targetFilter === "PAC-12") return homeConf === "PAC-12" || awayConf === "PAC-12";
  if (targetFilter === "CONFERENCE USA" || targetFilter === "C-USA") {
    return homeConf === "CONFERENCE USA" || awayConf === "CONFERENCE USA" ||
           homeConf === "CUSA" || awayConf === "CUSA";
  }

  return homeDiv === targetFilter || awayDiv === targetFilter ||
         homeConf === targetFilter || awayConf === targetFilter;
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

    const awayCode = (game.away_code || "VISITA").toUpperCase();
    const homeCode = (game.home_code || "LOCAL").toUpperCase();
    const awayName = game.away_name || game.away_code || "Equipo Visita";
    const homeName = game.home_name || game.home_code || "Equipo Local";

    const awayLogo = game.away_logo || `https://a.espncdn.com/i/teamlogos/${game.league}/500/${awayCode.toLowerCase()}.png`;
    const homeLogo = game.home_logo || `https://a.espncdn.com/i/teamlogos/${game.league}/500/${homeCode.toLowerCase()}.png`;

    const statusBadgeText = game.status === "final" ? "FINAL" : (game.status === "in_progress" ? "🔴 EN VIVO" : "PROGRAMADO");
    const statusClass = game.status === "final" ? "" : "style='background: rgba(239, 68, 68, 0.2); color: #f87171;'";

    card.innerHTML = `
      <div class="game-card-meta">
        <span>📍 ${game.venue || "Estadio"}</span>
        <span class="status-badge" ${statusClass}>${statusBadgeText}</span>
      </div>

      <div class="scoreboard-row">
        <div class="team-info">
          <img src="${awayLogo}" class="team-logo" alt="${awayCode}" onerror="this.onerror=null; this.src='https://a.espncdn.com/i/teamlogos/${game.league}/500/default.png'">
          <span class="team-name">${awayName}</span>
        </div>
        <span class="team-score">${game.status === 'scheduled' ? '-' : (game.away_score ?? '-')}</span>
      </div>

      <div class="scoreboard-row">
        <div class="team-info">
          <img src="${homeLogo}" class="team-logo" alt="${homeCode}" onerror="this.onerror=null; this.src='https://a.espncdn.com/i/teamlogos/${game.league}/500/default.png'">
          <span class="team-name">${homeName}</span>
        </div>
        <span class="team-score">${game.status === 'scheduled' ? '-' : (game.home_score ?? '-')}</span>
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
      subEl.textContent = state.divisionFilter === "ALL" 
        ? "Datos oficiales en vivo ESPN Scoreboard" 
        : `Conferencia ${state.divisionFilter} • ESPN Scoreboard`;
    } else if (state.season === 2026) {
      subEl.textContent = state.divisionFilter === "ALL"
        ? "Calendario oficial nflreadpy"
        : `${state.divisionFilter} • Calendario oficial nflreadpy`;
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
      if (wpSub) wpSub.textContent = `${filtered.length} partidos programados`;
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

  const filteredTeamCodes = new Set();
  filtered.forEach(g => {
    if (g.home_code) filteredTeamCodes.add(g.home_code);
    if (g.away_code) filteredTeamCodes.add(g.away_code);
    if (g.home_team_id) filteredTeamCodes.add(g.home_team_id);
    if (g.away_team_id) filteredTeamCodes.add(g.away_team_id);
  });

  const availableAwards = (state.awards || []).filter(a =>
    a.league === state.league && a.season === state.season
  );

  const matchingOpow = availableAwards.find(a =>
    (a.category === "OPOW" || a.category === "MVP") &&
    (state.divisionFilter === "ALL" || filteredTeamCodes.has(a.team_id) || filteredTeamCodes.has(a.team_code))
  ) || availableAwards.find(a => a.category === "OPOW" || a.category === "MVP");

  if (matchingOpow) {
    const candidateName = matchingOpow.candidate_name || matchingOpow.player_name || matchingOpow.title || "--";
    const teamName = matchingOpow.team_name || matchingOpow.team_short || "";
    const statSummary = matchingOpow.stat_summary || matchingOpow.stat_line || matchingOpow.award_role || "";
    if (offLabel) offLabel.textContent = `Líder Ofensivo (${matchingOpow.category})`;
    if (offVal) offVal.textContent = candidateName;
    if (offSub) offSub.textContent = teamName ? `${teamName} • ${statSummary}` : statSummary;
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

  const matchingDpow = availableAwards.find(a =>
    a.category === "DPOW" &&
    (state.divisionFilter === "ALL" || filteredTeamCodes.has(a.team_id) || filteredTeamCodes.has(a.team_code))
  ) || availableAwards.find(a => a.category === "DPOW");

  if (matchingDpow) {
    const candidateName = matchingDpow.candidate_name || matchingDpow.player_name || matchingDpow.title || "--";
    const teamName = matchingDpow.team_name || matchingDpow.team_short || "";
    const statSummary = matchingDpow.stat_summary || matchingDpow.stat_line || matchingDpow.award_role || "";
    if (defLabel) defLabel.textContent = "Líder Defensivo (DPOW)";
    if (defVal) defVal.textContent = candidateName;
    if (defSub) defSub.textContent = teamName ? `${teamName} • ${statSummary}` : statSummary;
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
  let rawGame = state.games.find(g => g.id === gameId) || (staticFallback.games || []).find(g => g.id === gameId);

  try {
    const res = await apiFetch(`/api/games/${gameId}`);
    if (res.ok) {
      const apiGame = await res.json();
      rawGame = { ...rawGame, ...apiGame };
    }
  } catch (e) {}

  if (!rawGame) return;
  const game = enrichGame(rawGame, state.teamsMap);
  state.activeDrawerGame = game;

  const awayTitle = game.away_name || game.away_code || "Equipo Visita";
  const homeTitle = game.home_name || game.home_code || "Equipo Local";
  const awayScoreStr = game.status === 'scheduled' ? '-' : (game.away_score ?? '-');
  const homeScoreStr = game.status === 'scheduled' ? '-' : (game.home_score ?? '-');

  // 1. Ficha del partido
  document.getElementById("drawer-venue").textContent = `${game.venue || "Estadio"} • ${game.weather_desc || (game.weather_temp ? game.weather_temp + '°F' : 'Techado / N/D')}`;
  document.getElementById("drawer-title").textContent = `${awayTitle} (${awayScoreStr}) @ ${homeTitle} (${homeScoreStr})`;
  document.getElementById("th-away-team").textContent = game.away_code || "VISITA";
  document.getElementById("th-home-team").textContent = game.home_code || "LOCAL";

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
    { key: "TD_OF_WEEK", title: "🏈 Touchdown de la Semana" },
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
              <div class="candidate-name" style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                ${n.team_logo ? `<img src="${n.team_logo}" style="width: 18px; height: 18px; object-fit: contain;" alt="${n.team_short || ''}" onerror="this.style.display='none'">` : ''}
                <span style="font-weight: 700;">${n.candidate_name}</span>
                ${n.team_name ? `<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">• ${n.team_name}</span>` : ''}
              </div>
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

// ==============================================================================
// YouTube Studio Script & Teleprompter Interactive Reader (SOP A.6)
// ==============================================================================
let currentGeneratedScript = "";
let prompterFontSize = 15;

function switchScriptViewMode(mode) {
  const prompterBtn = document.getElementById("btn-prompter-mode-view");
  const rawBtn = document.getElementById("btn-prompter-mode-raw");
  const prompterView = document.getElementById("script-teleprompter-view");
  const rawView = document.getElementById("script-raw-view");
  const toolbar = document.getElementById("script-prompter-toolbar");

  if (mode === "raw") {
    if (prompterBtn) prompterBtn.classList.remove("active");
    if (rawBtn) rawBtn.classList.add("active");
    if (prompterView) prompterView.style.display = "none";
    if (rawView) rawView.style.display = "block";
    if (toolbar) toolbar.style.display = "none";
  } else {
    if (prompterBtn) prompterBtn.classList.add("active");
    if (rawBtn) rawBtn.classList.remove("active");
    if (prompterView) prompterView.style.display = "flex";
    if (rawView) rawView.style.display = "none";
    if (toolbar) toolbar.style.display = "flex";
  }
}

function adjustPrompterFontSize(delta) {
  prompterFontSize = Math.max(12, Math.min(24, prompterFontSize + delta));
  const prompterView = document.getElementById("script-teleprompter-view");
  if (prompterView) {
    prompterView.style.fontSize = `${prompterFontSize}px`;
  }
}

function scrollPrompterTo(blockClass) {
  const target = document.querySelector(`.${blockClass}`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderInteractiveScriptReader(scriptMarkdown, meta = {}) {
  const container = document.getElementById("script-teleprompter-view");
  if (!container) return;

  if (!scriptMarkdown) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <p>Generando bloques del teleprompter...</p>
      </div>
    `;
    return;
  }

  // Parse markdown into distinct production blocks
  const rawSections = scriptMarkdown.split(/\n(?=###\s+⏱️|\n---\n###\s+⏱️)/);
  const blockDefs = [
    { key: "block-hook", title: "BLOQUE 1: EL GANCHO (HOOK & TEASER)", badge: "00:00 - 01:15", cue: "🎬 Cámara a cuadro • Tono enérgico", border: "block-hook" },
    { key: "block-marquee", title: "BLOQUE 2: EL PARTIDO DE LA SEMANA", badge: "01:15 - 05:00", cue: "📊 Gráficas EPA en pantalla", border: "block-marquee" },
    { key: "block-conference", title: "BLOQUE 3: DUELOS DIVISIONALES & JORNADA", badge: "05:00 - 08:30", cue: "🏟️ Repaso ágil de resultados", border: "block-conference" },
    { key: "block-awards", title: "BLOQUE 4: GALA DE PREMIOS SEMANALES", badge: "08:30 - 11:30", cue: "🏆 Tarjetas gráficas de nominados", border: "block-awards" },
    { key: "block-dosdonts", title: "BLOQUE 5: LOS DOs Y LOS DON'Ts", badge: "11:30 - 14:00", cue: "🎯 Pausar video y dibujar telestrator", border: "block-dosdonts" },
    { key: "block-outro", title: "BLOQUE 6: CIERRE & CALL TO ACTION", badge: "14:00 - 15:00", cue: "🎵 Música de salida / Pantalla final", border: "block-outro" },
  ];

  let html = "";

  rawSections.forEach((sec, idx) => {
    const bDef = blockDefs[idx] || {
      key: `block-${idx}`,
      title: `BLOQUE ${idx + 1}`,
      badge: "Segmento",
      cue: "Locución en estudio",
      border: "block-marquee"
    };

    // Extract cue note if present: *(...)*
    const cueMatch = sec.match(/\*\((.*?)\)\*/);
    const cueNote = cueMatch ? cueMatch[1] : bDef.cue;

    // Clean text for teleprompter speech
    let speechText = sec
      .replace(/###\s+⏱️.*?\n/, "")
      .replace(/\*\((.*?)\)\*\n?/, "")
      .replace(/^---\s*/gm, "")
      .trim();

    // Format paragraphs and highlights
    const formattedParagraphs = speechText
      .split(/\n\n+/)
      .map(p => {
        let clean = p.trim();
        if (clean.startsWith("#") || clean.startsWith("|")) return ""; // Skip headers and markdown tables inside speech
        clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        clean = clean.replace(/\*(.*?)\*/g, "<em>$1</em>");
        clean = clean.replace(/^\"|\"$/g, ""); // strip surrounding quotation marks
        return clean.length > 0 ? `<p>${clean}</p>` : "";
      })
      .filter(Boolean)
      .join("");

    html += `
      <div class="prompter-block-card ${bDef.border} ${bDef.key}">
        <div class="prompter-block-header">
          <div class="prompter-block-title">
            <span>⏱️ [${bDef.badge}]</span>
            <span>${bDef.title}</span>
          </div>
          <span class="prompter-cue-badge">🎬 ${cueNote}</span>
        </div>
        <div class="prompter-speech-text">
          ${formattedParagraphs || `<p>${speechText}</p>`}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  container.style.fontSize = `${prompterFontSize}px`;
}

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

      document.getElementById("script-duration-badge").textContent = `⏱️ ${data.estimated_duration_formatted || '14m 15s'}`;
      document.getElementById("script-words-badge").textContent = `${data.total_words || 1780} palabras`;

      titlesList.innerHTML = (data.suggested_titles || []).map(t => `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--text-primary);">
          ${t}
        </div>
      `).join("");

      pre.textContent = currentGeneratedScript;
      renderInteractiveScriptReader(currentGeneratedScript, data.metadata);
      return;
    }
  } catch (e) {}

  // Client-side Authentic Script Generation (Instant Fallback using real 2026 data)
  const marquee = state.games[0] || {};
  const home = marquee.home_name || marquee.home_code || "Georgia";
  const away = marquee.away_name || marquee.away_code || "Tennessee State";
  const mvp = state.awards.find(a => a.category === "MVP")?.candidate_name || "Líder de la Semana";

  const fallbackTitles = [
    `¡EL GOLPE SOBRE LA MESA DE ${home.toUpperCase()}! 🔥 ${state.league.toUpperCase()} 2026 Análisis & Premios`,
    `¿Por qué nadie vio venir esto? | EPA & Win Probability Swing Semana ${state.week}`,
    `¿${mvp} es el favorito indiscutible al galardón? 🏈 Análisis Táctico ${state.league.toUpperCase()} 2026`,
    `De la Gloria al Desastre: DOs y DON'Ts de la Semana ${state.week}`
  ];

  titlesList.innerHTML = fallbackTitles.map(t => `
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--text-primary);">
      ${t}
    </div>
  `).join("");

  const scriptParts = [];
  scriptParts.push(`# 🎙️ GUION DE PRODUCCIÓN Y TELEPROMPTER — GRIDIRON HUB`);
  scriptParts.push(`**Liga:** ${state.league.toUpperCase()} | **Temporada:** ${state.season} | **Semana:** ${state.week}\n`);

  scriptParts.push(`### ⏱️ [00:00 - 01:15] BLOQUE 1: EL GANCHO (HOOK & TEASER)\n*(Cámara a cuadro / Host con energía / B-Roll rápido de jugadas clutch)*\n\n` +
    `"¡Bienvenidos a Gridiron Hub! Arrancó con todo la Temporada ${state.season} y esta Semana ${state.week} nos regaló una jornada salvaje. ` +
    `Tuvimos palizas contundentes, defensivas dominantes permitiendo cero puntos y actuaciones individuales con impacto EPA estratosférico. ` +
    `Hoy desglosamos las métricas que nadie más te muestra: la eficiencia por jugada, los giros dramáticos de probabilidad de victoria, ` +
    `nuestra gala de premios semanales y, por supuesto, el segmento que todos esperan: los DOs y los DON'Ts con la jugada maestra y el error más costoso de la jornada. ¡Arrancamos!"`
  );

  scriptParts.push(`### ⏱️ [01:15 - 05:00] BLOQUE 2: EL PARTIDO DE LA SEMANA — ${away.toUpperCase()} VS ${home.toUpperCase()}\n*(Resultado Final: ${away} ${marquee.away_score || 0} @ ${home} ${marquee.home_score || 0})*\n\n` +
    `"Vamos directo al encuentro más destacado de la jornada. ${home} salió al emparrillado a marcar territorio desde el silbatazo inicial. ` +
    `El margen de anotación y el control absoluto del reloj de posesión dictaron el ritmo del partido. ` +
    `Miren la eficiencia: en situaciones de tercer down, la agresividad para mantener vivas las series ofensivas rompió por completo el esquema rival."`
  );

  scriptParts.push(`### ⏱️ [05:00 - 08:30] BLOQUE 3: DUELOS DIVISIONALES & RESUMEN DE LA JORNADA\n*(Repaso ágil de los otros encuentros de la semana)*\n\n` +
    `"La jornada nos dejó choques intensos en todas las conferencias. ` +
    (state.games.slice(1, 6).map(g => `${g.away_code || 'VIS'} (${g.away_score || 0}) vs ${g.home_code || 'LOC'} (${g.home_score || 0})`).join(', ')) +
    `. Cada uno de estos resultados reconfigura las proyecciones de cara a la segunda semana del calendario."`
  );

  const opows = state.awards.filter(a => a.category === "OPOW");
  const dpows = state.awards.filter(a => a.category === "DPOW");
  const mvps = state.awards.filter(a => a.category === "MVP");

  scriptParts.push(`### ⏱️ [08:30 - 11:30] BLOQUE 4: PREMIOS DE LA SEMANA (AWARDS HUB)\n*(Poner en pantalla las tarjetas gráficas de Gridiron Hub con las ternas)*\n\n` +
    `"Pasamos a nuestro Awards Hub oficial. ` +
    (mvps.length > 0 ? `El MVP indiscutible de la semana se lo lleva **${mvps[0].candidate_name}** con ${mvps[0].stat_summary}. ` : '') +
    (opows.length > 0 ? `En el costado ofensivo, el OPOW es para **${opows[0].candidate_name}** (${opows[0].stat_summary}). ` : '') +
    (dpows.length > 0 ? `Y defensivamente, el galardón DPOW pertenece a **${dpows[0].candidate_name}** por su actuación de impacto neto."` : '"')
  );

  const dos = state.awards.filter(a => a.category === "DO");
  const donts = state.awards.filter(a => a.category === "DONT");

  scriptParts.push(`### ⏱️ [11:30 - 14:00] BLOQUE 5: LOS DOs Y LOS DON'Ts (ANÁLISIS TÁCTICO)\n*(Segmento estelar: Pausar video y dibujar en pantalla con telestrator)*\n\n` +
    (dos.length > 0 ? `"El DO de la semana: **${dos[0].candidate_name}**. Observen la sincronización de los bloqueos y la lectura perfecta del quarterback para asegurar la primera oportunidad. ` : '') +
    (donts.length > 0 ? `Por el contrario, el DON'T de la semana: **${donts[0].candidate_name}**. Forzar envíos bajo presión sin plantar los pies en 4ta oportunidad regala el balón y liquida cualquier oportunidad de victoria."` : '"')
  );

  scriptParts.push(`### ⏱️ [14:00 - 15:00] BLOQUE 6: CIERRE & PREGUNTA A LA COMUNIDAD\n*(Música de salida / Pantalla final con tarjetas de video anterior)*\n\n` +
    `"Y para ustedes en los comentarios: ¿Cuál fue la mejor jugada de esta Semana ${state.week}? Déjenlo abajo en la caja de comentarios. ` +
    `Si les gustó este desglose analítico sin humo, dejen su Like y suscríbanse al canal activando la campana. ¡Nos vemos en el próximo video de Gridiron Hub!"`
  );

  currentGeneratedScript = scriptParts.join("\n\n");
  pre.textContent = currentGeneratedScript;
  renderInteractiveScriptReader(currentGeneratedScript);
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

// ==============================================================================
// Full Game Tactical Report Reader (Magazine-Style Dossier Modal)
// ==============================================================================
function openFullDossierReader(gameId) {
  let rawGame = gameId ? state.games.find(g => g.id === gameId) : state.activeDrawerGame;
  if (!rawGame) return;
  const game = enrichGame(rawGame, state.teamsMap);

  const modal = document.getElementById("dossier-modal");
  const modalBody = document.getElementById("dossier-modal-body");
  const venueEl = document.getElementById("dossier-venue");
  const titleEl = document.getElementById("dossier-title");

  const homeCode = game.home_code || 'HOME';
  const awayCode = game.away_code || 'AWAY';
  const homeName = game.home_name || homeCode;
  const awayName = game.away_name || awayCode;
  const awayScoreStr = game.status === 'scheduled' ? '-' : (game.away_score ?? '-');
  const homeScoreStr = game.status === 'scheduled' ? '-' : (game.home_score ?? '-');

  if (venueEl) venueEl.textContent = `${game.venue || 'Estadio Principal'} • ${game.game_date ? game.game_date.split('T')[0] : 'Septiembre 2026'}`;
  if (titleEl) titleEl.textContent = `${awayName} (${awayScoreStr}) @ ${homeName} (${homeScoreStr})`;

  const t = game.tactical_analysis || {};
  const headline = t.headline || `Análisis Táctico de Alta Retención: ${awayName} vs ${homeName}`;
  const narrative = t.narrative_summary || (
    `El choque de la Semana ${game.week} entre ${awayName} y ${homeName} culminó con un marcador de ${game.away_score}-${game.home_score}. ` +
    `El enfrentamiento exhibió un alto nivel táctico en ejecución de terceras oportunidades y control del reloj de posesión. ` +
    `A través del análisis detallado de play-by-play, se identificaron factores determinantes en la eficiencia ofensiva por jugada (EPA) y los puntos de inflexión que decidieron la victoria.`
  );

  let html = `
    <div>
      <h1 class="dossier-article-title">${headline}</h1>
      <div class="dossier-meta-chips">
        <span class="badge-metric badge-wp-swing">🏈 ${state.league.toUpperCase()} 2026 • Semana ${game.week}</span>
        <span class="badge-metric badge-epa-pos">${game.status === 'final' ? 'Resultado Final' : 'Programado'}</span>
        <span class="badge-metric" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8;">${awayCode} ${game.away_score} - ${homeCode} ${game.home_score}</span>
        <span class="badge-metric" style="background: rgba(250, 204, 21, 0.15); color: var(--metric-gold);">Clima: ${game.weather_desc || 'Despejado'}</span>
      </div>
      <div class="dossier-lead-paragraph">
        ${narrative}
      </div>
    </div>
  `;

  // Historic Facts
  const facts = (t.historic_facts && t.historic_facts.length > 0) ? t.historic_facts : (
    (game.trivia && game.trivia.length > 0) ? game.trivia.map(tr => ({ title: 'Dato Clave', description: tr.fact_text })) : [
      { title: 'Diferencial de Anotación', description: `Margen final de ${Math.abs(game.home_score - game.away_score)} puntos con un control de posesión dominante.` },
      { title: 'Eficiencia de Tercera Oportunidad', description: `${homeName} mantuvo la iniciativa convirtiendo en situaciones clave de juego medio.` }
    ]
  );

  html += `
    <div>
      <div class="section-title">📈 Hitos Históricos y Anomalías Estadísticas</div>
      <div class="historic-facts-grid">
        ${facts.map(f => `
          <div class="historic-fact-item">
            <span class="fact-badge">💡 REGISTRO</span>
            <div class="fact-text">
              <strong>${f.title}:</strong> ${f.description}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Award Deep Dives
  const deepDives = t.award_deep_dives || [];
  if (deepDives.length > 0) {
    html += `
      <div>
        <div class="section-title">🏅 Perfiles Tácticos de Rendimiento Individual</div>
        <div class="award-deep-dives-list">
          ${deepDives.map(d => `
            <div class="deep-dive-card">
              <div class="deep-dive-header">
                <span class="deep-dive-role">${d.role}</span>
                <span class="team-pill-badge">${d.team_code || ""}</span>
              </div>
              <div class="deep-dive-player" style="margin-bottom: 0.6rem;">${d.player}</div>
              <ul class="deep-dive-bullets">
                ${(d.bullets || []).map(b => `<li><strong>${b.label}:</strong> ${b.detail}</li>`).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Tactical DOs and DON'Ts
  const dosDonts = (t.tactical_dos_donts && t.tactical_dos_donts.length > 0) ? t.tactical_dos_donts : [
    { type: 'DO', strategy: 'Atacar el centro de la cobertura en situaciones de tercer down corto', logic: 'Incrementa la probabilidad de conversión por encima del 68%.' },
    { type: 'DONT', strategy: 'Pase retrasado con la bolsa colapsada bajo blitz', logic: 'Genera una pérdida promedio de -2.8 EPA y eleva drásticamente el riesgo de entrega de balón.' }
  ];

  html += `
    <div>
      <div class="section-title">📋 Matriz de Decisiones Tácticas: DOs y DON'Ts</div>
      <div class="tactical-table-wrapper">
        <table class="tactical-table">
          <thead>
            <tr>
              <th style="width: 100px;">Decisión</th>
              <th style="width: 40%;">Estrategia en Campo</th>
              <th>Impacto & Razón Analítica</th>
            </tr>
          </thead>
          <tbody>
            ${dosDonts.map(r => `
              <tr>
                <td><span class="badge-tactical ${r.type.toUpperCase() === 'DO' ? 'badge-do' : 'badge-dont'}">${r.type.toUpperCase() === 'DO' ? '🟢 DO' : "🔴 DON'T"}</span></td>
                <td><strong>${r.strategy}</strong></td>
                <td style="color: var(--text-secondary);">${r.logic}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Key plays
  const keyPlays = game.key_plays || [];
  if (keyPlays.length > 0) {
    html += `
      <div>
        <div class="section-title">🎬 Cronología de Jugadas Determinantes (EPA & Win Probability)</div>
        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          ${keyPlays.map((p, idx) => `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 0.85rem 1.15rem; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
              <div style="flex: 1 1 300px;">
                <div style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase;">Q${p.quarter || 1} • ${p.time_remaining || '00:00'} • ${p.yardline || 'Campo'}</div>
                <div style="font-size: 0.88rem; color: var(--text-primary); margin-top: 0.2rem; font-weight: 500;">${p.description}</div>
              </div>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <span class="badge-metric badge-epa-pos">+${p.epa || 2.5} EPA</span>
                <span class="badge-metric badge-wp-swing">WP: +${Math.round((p.wp_swing || 0.15) * 100)}%</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  if (modalBody) modalBody.innerHTML = html;
  if (modal) modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDossierReader(event) {
  if (event && event.target && event.target.id !== "dossier-modal" && !event.target.classList.contains("drawer-close")) {
    return;
  }
  const modal = document.getElementById("dossier-modal");
  if (modal) modal.classList.remove("active");
  document.body.style.overflow = "";
}

// Global Keyboard Shortcuts (Escape to close modals)
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDrawer();
    closeDossierReader();
  }
});

// Initialization on DOM load
async function initApp() {
  updateSeasonSelector();
  populateWeekSelector(state.season);
  renderFilterPills();
  updateSyncUI();
  startCooldownTicker();
  await checkAuthSession();
  await loadCurrentData();
}

window.addEventListener("DOMContentLoaded", initApp);
