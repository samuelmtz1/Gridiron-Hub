/**
 * Gridiron Hub - Frontend Reactive Controller
 * Connects to FastAPI Backend or operates in 100% Offline Standalone Mode.
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
  activeDrawerGame: null,
  authToken: sessionStorage.getItem("gridiron_token") || null,
  currentUser: sessionStorage.getItem("gridiron_user") || null,
};

// Authentication & API Helpers
const DEFAULT_API_URL = "https://gridiron-hub-2lr3.onrender.com";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? ""
  : (window.GRIDIRON_API_URL || localStorage.getItem("gridiron_api_url") || DEFAULT_API_URL);

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
    alert(`URL del backend en Render configurada: ${url}`);
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
      await loadCurrentData();
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
}

async function checkAuthSession() {
  updateAuthUI();
  if (state.authToken) {
    try {
      const res = await apiFetch("/api/auth/verify");
      if (!res.ok) {
        logoutUser();
      }
    } catch (e) {
      // Offline fallback
    }
  }
}

// Comprehensive Embedded Dataset for Multi-Week, NCAA & Super Bowl LX
const MOCK_DATA = {
  "games": [
    {
      "id": "nfl_2024_w11_kc_buf",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "home_code": "BUF",
      "home_name": "Buffalo Bills",
      "home_short": "Bills",
      "home_score": 30,
      "home_primary": "#00338D",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
      "home_conference": "AFC",
      "home_division": "East",
      "away_code": "KC",
      "away_name": "Kansas City Chiefs",
      "away_short": "Chiefs",
      "away_score": 21,
      "away_primary": "#E31837",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
      "away_conference": "AFC",
      "away_division": "West",
      "status": "final",
      "venue": "Highmark Stadium",
      "weather_temp": 46,
      "weather_desc": "Nublado, Viento 12 mph",
      "highlight_url": "https://www.youtube.com/results?search_query=Chiefs+vs+Bills+Week+11+2024+highlights",
      "team_stats": [
        {
          "id": "stat_kc_w11",
          "game_id": "nfl_2024_w11_kc_buf",
          "team_id": "nfl_KC",
          "is_home": false,
          "total_yards": 259,
          "passing_yards": 196,
          "rushing_yards": 63,
          "turnovers": 2,
          "epa_total": -3.2,
          "epa_pass": -0.8,
          "epa_rush": -2.4,
          "third_down_comp": 5,
          "third_down_att": 10,
          "red_zone_comp": 3,
          "red_zone_att": 3,
          "time_of_possession": "27:14"
        },
        {
          "id": "stat_buf_w11",
          "game_id": "nfl_2024_w11_kc_buf",
          "team_id": "nfl_BUF",
          "is_home": true,
          "total_yards": 366,
          "passing_yards": 262,
          "rushing_yards": 104,
          "turnovers": 1,
          "epa_total": 14.8,
          "epa_pass": 9.4,
          "epa_rush": 5.4,
          "third_down_comp": 9,
          "third_down_att": 15,
          "red_zone_comp": 3,
          "red_zone_att": 4,
          "time_of_possession": "32:46"
        }
      ],
      "key_plays": [
        {
          "id": "play_w11_kc_buf_01",
          "game_id": "nfl_2024_w11_kc_buf",
          "play_id": "p_buf_4th_td",
          "quarter": 4,
          "time_remaining": "02:17",
          "down": 4,
          "ydstogo": 2,
          "yardline": "KC 26",
          "possession_team_id": "nfl_BUF",
          "play_type": "rush",
          "description": "J.Allen acarreo por el centro 26 yardas para TOUCHDOWN, rompiendo tackleadas de Chamarri Conner y Bryan Cook. Sella la victoria y rompe el invicto de KC.",
          "epa": 4.65,
          "wp_before": 0.81,
          "wp_after": 0.99,
          "wp_swing": 0.18,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "02:17 Q4"
        },
        {
          "id": "play_w11_kc_buf_02",
          "game_id": "nfl_2024_w11_kc_buf",
          "play_id": "p_buf_bernard_int",
          "quarter": 4,
          "time_remaining": "01:07",
          "down": 4,
          "ydstogo": 13,
          "yardline": "KC 42",
          "possession_team_id": "nfl_KC",
          "play_type": "pass",
          "description": "P.Mahomes pase profundo interceptado por T.Bernard en la yarda 45 de KC. Fin oficial de la racha invicta de 15 partidos de Chiefs.",
          "epa": -4.85,
          "wp_before": 0.05,
          "wp_after": 0.0,
          "wp_swing": 0.05,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "01:07 Q4"
        }
      ],
      "trivia": [
        {
          "id": "triv_w11_buf_01",
          "game_id": "nfl_2024_w11_kc_buf",
          "category": "streak",
          "fact_text": "Los Bills rompen la racha de 15 victorias consecutivas de Patrick Mahomes (incluyendo playoffs)."
        },
        {
          "id": "triv_w11_buf_02",
          "game_id": "nfl_2024_w11_kc_buf",
          "category": "record",
          "fact_text": "Josh Allen registra su cuarta victoria en temporada regular ante Kansas City, mayor cantidad en la era Mahomes."
        }
      ],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w11_kc_buf",
        "game_id": "nfl_2024_w11_kc_buf",
        "headline": "Defensive Mastery and Tactical Supremacy: A Comprehensive Analysis of Chiefs @ Bills",
        "narrative_summary": "The narrative of Week 11's marquee matchup at Highmark Stadium was defined by Sean McDermott's aggressive fourth-down architecture and Buffalo's disguised two-high safety shells. In a decisive 30-21 victory over the Kansas City Chiefs, the Bills dismantled Kansas City's 15-game winning streak. While Josh Allen's 26-yard touchdown rumble on 4th-and-2 served as the cinematic exclamation point, it was Buffalo's interior defense that methodically choked Patrick Mahomes' passing options, holding the Chiefs to just 259 total yards and forcing two costly interceptions.",
        "historic_facts": [
          {
            "title": "The Undefeated Fall",
            "description": "Kansas City arrived 9-0; the loss snapped their 15-game winning streak dating back to Christmas Day 2023."
          },
          {
            "title": "Regular Season Supremacy",
            "description": "Josh Allen improved to 4-1 all-time against Patrick Mahomes in regular season matchups, standing as the only quarterback in NFL history with a winning record against him (minimum 3 games)."
          },
          {
            "title": "The Fourth-Down Crucible",
            "description": "Leading 23-21 with 2:17 remaining, McDermott bypassed a 44-yard field goal on 4th-and-2, choosing to attack Spagnuolo's blitz rather than handing Mahomes a two-minute drill."
          },
          {
            "title": "Turnover Inversion",
            "description": "Buffalo completed the game without committing a single turnover while picking off Mahomes twice, generating 10 critical points off takeaways."
          },
          {
            "title": "Explosive Play Neutralization",
            "description": "Kansas City was held without a single pass play over 25 yards, forced into 19 completions under 8 air yards."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "The Buffalo Front Four (Collective)",
            "team_code": "BUF",
            "bullets": [
              {
                "label": "Statistical Impact",
                "detail": "Generated 18 pressures, 3.0 sacks, 5 tackles for loss, and 8 QB hits solely with a four-man rush."
              },
              {
                "label": "Pressure Rate",
                "detail": "Generated a 44.1% pressure rate against Mahomes without blitzing a single defensive back."
              }
            ]
          },
          {
            "role": "Linebacker & Interception of the Game",
            "player": "Terrel Bernard",
            "team_code": "BUF",
            "bullets": [
              {
                "label": "The Game-Sealing Punctuation",
                "detail": "Understood Mahomes' cadence on 4th-and-13 with 1:07 left, sinking into the robber zone to snag the clinching interception."
              },
              {
                "label": "Coverage Density",
                "detail": "Allowed only 1 completion for 6 yards on 4 targets in his coverage zone."
              }
            ]
          },
          {
            "role": "Sack of the Week & Game on the Line Moment",
            "player": "Greg Rousseau & Von Miller",
            "team_code": "BUF",
            "bullets": [
              {
                "label": "Third-Quarter Strip Pressure",
                "detail": "Rousseau's speed rush on 3rd-and-9 forced Mahomes into a hurried sack-fumble."
              }
            ]
          },
          {
            "role": "Defensive Back of the Game",
            "player": "Christian Benford",
            "team_code": "BUF",
            "bullets": [
              {
                "label": "Target Mitigation",
                "detail": "Targeted 6 times, allowing only 2 receptions for 18 yards with 2 pass breakups against DeAndre Hopkins."
              }
            ]
          },
          {
            "role": "Special Teams of the Week",
            "player": "Tyler Bass",
            "team_code": "BUF",
            "bullets": [
              {
                "label": "Wind Mastery",
                "detail": "Converted 3 extra points and a 33-yard field goal amidst 14 mph crosswinds at Highmark Stadium."
              }
            ]
          },
          {
            "role": "The Engine (Official Game MVP)",
            "player": "Josh Allen",
            "team_code": "BUF",
            "bullets": [
              {
                "label": "Volume & Efficiency",
                "detail": "262 passing yards, 55 rushing yards, 2 total touchdowns, and +14.8 total EPA."
              },
              {
                "label": "The 26-Yard Dagger",
                "detail": "On 4th-and-2 with 2:17 left, broke multiple tackles to score the iconic 26-yard game-winning touchdown."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Deploy Two-High Shells with Robber Disguise",
            "logic": "Buffalo played Cover-4 and Cover-6 on 71% of snaps, eliminating vertical routes and forcing short checkdowns."
          },
          {
            "type": "DO",
            "strategy": "Maintain 4th-and-Short Aggressiveness vs Heavy Blitz",
            "logic": "Going for it on 4th-and-2 avoided giving Mahomes the football with two minutes and a single-possession deficit."
          },
          {
            "type": "DONT",
            "strategy": "Empty the Second Level with Cover-0 Blitzes vs Allen",
            "logic": "Spagnuolo's all-out blitz cleared the middle of the field, giving Allen an open lane to scamper 26 yards for the touchdown."
          },
          {
            "type": "DONT",
            "strategy": "Force Boundary Passes Under Interior Duress",
            "logic": "Mahomes' panic throw on 4th-and-13 into Bernard's robber coverage resulted in the game-ending interception."
          }
        ]
      }
    },
    {
      "id": "nfl_2024_w11_bal_pit",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "home_code": "PIT",
      "home_name": "Pittsburgh Steelers",
      "home_short": "Steelers",
      "home_score": 18,
      "home_primary": "#FFB612",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png",
      "home_conference": "AFC",
      "home_division": "North",
      "away_code": "BAL",
      "away_name": "Baltimore Ravens",
      "away_short": "Ravens",
      "away_score": 16,
      "away_primary": "#241773",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
      "away_conference": "AFC",
      "away_division": "North",
      "status": "final",
      "venue": "Acrisure Stadium",
      "weather_temp": 52,
      "weather_desc": "Despejado",
      "highlight_url": "https://www.youtube.com/results?search_query=Ravens+vs+Steelers+Week+11+2024+highlights",
      "team_stats": [
        {
          "id": "stat_bal_w11",
          "game_id": "nfl_2024_w11_bal_pit",
          "team_id": "nfl_BAL",
          "is_home": false,
          "total_yards": 329,
          "passing_yards": 205,
          "rushing_yards": 124,
          "turnovers": 3,
          "epa_total": -6.4,
          "epa_pass": -3.1,
          "epa_rush": -3.3,
          "third_down_comp": 4,
          "third_down_att": 11,
          "red_zone_comp": 1,
          "red_zone_att": 3,
          "time_of_possession": "23:38"
        },
        {
          "id": "stat_pit_w11",
          "game_id": "nfl_2024_w11_bal_pit",
          "team_id": "nfl_PIT",
          "is_home": true,
          "total_yards": 303,
          "passing_yards": 181,
          "rushing_yards": 122,
          "turnovers": 1,
          "epa_total": 1.2,
          "epa_pass": 0.5,
          "epa_rush": 0.7,
          "third_down_comp": 4,
          "third_down_att": 16,
          "red_zone_comp": 0,
          "red_zone_att": 4,
          "time_of_possession": "36:22"
        }
      ],
      "key_plays": [
        {
          "id": "play_w11_bal_pit_01",
          "game_id": "nfl_2024_w11_bal_pit",
          "play_id": "p_pit_fumble_henry",
          "quarter": 1,
          "time_remaining": "13:22",
          "down": 2,
          "ydstogo": 8,
          "yardline": "BAL 41",
          "possession_team_id": "nfl_BAL",
          "play_type": "rush",
          "description": "D.Henry acarreo de 3 yardas. N.Herbig fuerza balón suelto, recuperado por P.Queen en la yarda 44 de BAL. Primer golpe defensivo de Pittsburgh.",
          "epa": -3.9,
          "wp_before": 0.52,
          "wp_after": 0.71,
          "wp_swing": 0.19,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "13:22 Q1"
        },
        {
          "id": "play_w11_bal_pit_02",
          "game_id": "nfl_2024_w11_bal_pit",
          "play_id": "p_pit_2pt_stop",
          "quarter": 4,
          "time_remaining": "01:06",
          "down": 0,
          "ydstogo": 2,
          "yardline": "PIT 2",
          "possession_team_id": "nfl_BAL",
          "play_type": "rush",
          "description": "L.Jackson intento de conversión de 2 puntos por pase/acarreo es contenido por J.Porter y D.Elliott. Detención crucial para sellar el 18-16.",
          "epa": -2.15,
          "wp_before": 0.58,
          "wp_after": 0.96,
          "wp_swing": 0.38,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "01:06 Q4"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w11_bal_pit",
        "game_id": "nfl_2024_w11_bal_pit",
        "headline": "Trench Attrition & Red Zone Denial: Pittsburgh Smothers the League's #1 Offense",
        "narrative_summary": "In the NFL's premier defensive bloodbath, Mike Tomlin's Steelers delivered a tactical masterclass, toppling the Baltimore Ravens 18-16 at Acrisure Stadium. Despite scoring zero offensive touchdowns, Pittsburgh relied on Chris Boswell's leg and an impregnable front seven that contained Derrick Henry to just 65 yards and forced three crucial Baltimore turnovers.",
        "historic_facts": [
          {
            "title": "Tomlin's Lamar Hex",
            "description": "Mike Tomlin improved to 8-1 all-time against Lamar Jackson, holding the two-time MVP to his lowest passer rating of the 2024 season (66.1)."
          },
          {
            "title": "Touchdown-less Victory",
            "description": "Pittsburgh became only the second team in 2024 to win a game without scoring an offensive touchdown, fueled by 6 Chris Boswell field goals."
          },
          {
            "title": "Two-Point Conversion Stand",
            "description": "Holding a 18-16 lead with 1:06 left, Pittsburgh stuffed Lamar Jackson on a designed quarterback sprint-out to preserve the win."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "T.J. Watt & Nick Herbig (Edge Tandem)",
            "team_code": "PIT",
            "bullets": [
              {
                "label": "Game-Changing Disruption",
                "detail": "Herbig punched the ball free from Derrick Henry on Baltimore's opening drive, setting an immediate tone."
              },
              {
                "label": "Pressure Rate",
                "detail": "Watt generated 7 quarterback hurries, commanding double teams on 68% of dropbacks."
              }
            ]
          },
          {
            "role": "Linebacker & Forced Fumble of the Game",
            "player": "Patrick Queen (Revenge Game)",
            "team_code": "PIT",
            "bullets": [
              {
                "label": "Stripping Likely",
                "detail": "Stripped former teammate Isaiah Likely right before halftime and recovered the fumble to set up a Boswell field goal."
              },
              {
                "label": "Tackle Leadership",
                "detail": "Finished with 10 total tackles and 1 tackle for loss in his first game against Baltimore."
              }
            ]
          },
          {
            "role": "Special Teams of the Week",
            "player": "Chris Boswell",
            "team_code": "PIT",
            "bullets": [
              {
                "label": "Six-Field Goal Siege",
                "detail": "Converted field goals of 32, 52, 32, 57, 27, and 50 yards in freezing conditions."
              },
              {
                "label": "Franchise Record",
                "detail": "Became the first kicker in Steelers franchise history with three 50+ yard field goals in a single game."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Set Hard Edge Boundaries Against Derrick Henry",
            "logic": "Pittsburgh kept both outside linebackers on the contain line, holding Henry under 70 yards."
          },
          {
            "type": "DONT",
            "strategy": "Commit Pre-Snap Penalties in Enemy Territory",
            "logic": "Baltimore committed 12 penalties for 80 yards, repeatedly pushing them out of field goal range."
          }
        ]
      }
    },
    {
      "id": "nfl_2024_w11_gb_chi",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "home_code": "CHI",
      "home_name": "Chicago Bears",
      "home_short": "Bears",
      "home_score": 19,
      "home_primary": "#0B162A",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
      "home_conference": "NFC",
      "home_division": "North",
      "away_code": "GB",
      "away_name": "Green Bay Packers",
      "away_short": "Packers",
      "away_score": 20,
      "away_primary": "#203731",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png",
      "away_conference": "NFC",
      "away_division": "North",
      "status": "final",
      "venue": "Soldier Field",
      "weather_temp": 48,
      "weather_desc": "Viento racheado 18 mph",
      "highlight_url": "https://www.youtube.com/results?search_query=Packers+vs+Bears+Week+11+2024+highlights",
      "team_stats": [
        {
          "id": "stat_gb_w11",
          "game_id": "nfl_2024_w11_gb_chi",
          "team_id": "nfl_GB",
          "is_home": false,
          "total_yards": 366,
          "passing_yards": 260,
          "rushing_yards": 106,
          "turnovers": 1,
          "epa_total": 6.2,
          "epa_pass": 4.8,
          "epa_rush": 1.4,
          "third_down_comp": 3,
          "third_down_att": 5,
          "red_zone_comp": 2,
          "red_zone_att": 2,
          "time_of_possession": "24:03"
        },
        {
          "id": "stat_chi_w11",
          "game_id": "nfl_2024_w11_gb_chi",
          "team_id": "nfl_CHI",
          "is_home": true,
          "total_yards": 391,
          "passing_yards": 212,
          "rushing_yards": 179,
          "turnovers": 0,
          "epa_total": 4.5,
          "epa_pass": 2.1,
          "epa_rush": 2.4,
          "third_down_comp": 9,
          "third_down_att": 16,
          "red_zone_comp": 2,
          "red_zone_att": 3,
          "time_of_possession": "35:57"
        }
      ],
      "key_plays": [
        {
          "id": "play_w11_gb_chi_01",
          "game_id": "nfl_2024_w11_gb_chi",
          "play_id": "p_gb_block_fg",
          "quarter": 4,
          "time_remaining": "00:03",
          "down": 4,
          "ydstogo": 6,
          "yardline": "GB 28",
          "possession_team_id": "nfl_CHI",
          "play_type": "field_goal",
          "description": "C.Santos intento de gol de campo de 46 yardas es BLOQUEADO por K.Brooks por el centro. Green Bay mantiene viva la racha histórica sobre Chicago con reloj en ceros.",
          "epa": -4.2,
          "wp_before": 0.24,
          "wp_after": 1.0,
          "wp_swing": 0.76,
          "is_turnover": 0,
          "is_touchdown": 0,
          "highlight_timestamp": "00:00 Q4"
        }
      ],
      "trivia": [
        {
          "id": "triv_w11_gb_01",
          "game_id": "nfl_2024_w11_gb_chi",
          "category": "historical",
          "fact_text": "Green Bay extiende a 11 partidos consecutivos su dominio invicto sobre los Bears, la racha activa más larga de la rivalidad."
        }
      ],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w11_gb_chi",
        "game_id": "nfl_2024_w11_gb_chi",
        "headline": "Special Teams Miracle & Trench Penetration: Karl Brooks' Block Stuns Soldier Field",
        "narrative_summary": "In the 209th chapter of the NFL's oldest rivalry, the Green Bay Packers escaped Soldier Field with a 20-19 victory after defensive lineman Karl Brooks penetrated the Bears' field goal protection unit to block Cairo Santos' 46-yard attempt with zeros on the clock. While rookie Caleb Williams orchestrated an impressive 4th-quarter comeback drive, Chicago's premature decision to settle for a long kick on first down proved fatal.",
        "historic_facts": [
          {
            "title": "Historic Rivalry Streak",
            "description": "Green Bay extended their win streak over Chicago to 11 consecutive games, the longest streak in the history of the 103-year rivalry."
          },
          {
            "title": "The Final Second Block",
            "description": "It marked Green Bay's first blocked game-winning field goal attempt at 0:00 since 1999."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP & Game on the Line Moment",
            "player": "Karl Brooks & Field Goal Block Unit",
            "team_code": "GB",
            "bullets": [
              {
                "label": "Fingertip Miracle",
                "detail": "Brooks timed the snap perfectly, slicing between Bears interior linemen Scott and Jenkins to get a glove on the ball."
              },
              {
                "label": "Trench Penetration",
                "detail": "The Packers' block unit generated a 2-yard push into the Bears' backfield."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Christian Watson",
            "team_code": "GB",
            "bullets": [
              {
                "label": "Explosive Playmaker",
                "detail": "Caught 4 passes for 150 yards, including a 60-yard diving bomb that set up the Packers' go-ahead score."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Overload the Interior A-Gap on Field Goal Protection",
            "logic": "Rich Bisaccia's special teams scheme exploited low trajectory angles from Santos' middle range."
          },
          {
            "type": "DONT",
            "strategy": "Settle for a 46-Yard Field Goal on 1st Down with 30 Seconds Left",
            "logic": "Chicago had 30 seconds and a timeout, but elected to run down the clock instead of gaining an extra 5-10 yards for a safer kick."
          }
        ]
      }
    },
    {
      "id": "nfl_2024_w11_det_jax",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "home_code": "DET",
      "home_name": "Detroit Lions",
      "home_short": "Lions",
      "home_score": 52,
      "home_primary": "#0076B6",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
      "home_conference": "NFC",
      "home_division": "North",
      "away_code": "JAX",
      "away_name": "Jacksonville Jaguars",
      "away_short": "Jaguars",
      "away_score": 6,
      "away_primary": "#006778",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png",
      "away_conference": "AFC",
      "away_division": "South",
      "status": "final",
      "venue": "Ford Field (Domo)",
      "weather_temp": 70,
      "weather_desc": "Clima controlado",
      "highlight_url": "https://www.youtube.com/results?search_query=Jaguars+vs+Lions+Week+11+2024+highlights",
      "team_stats": [
        {
          "id": "stat_jax_w11",
          "game_id": "nfl_2024_w11_det_jax",
          "team_id": "nfl_JAX",
          "is_home": false,
          "total_yards": 170,
          "passing_yards": 129,
          "rushing_yards": 41,
          "turnovers": 1,
          "epa_total": -18.4,
          "epa_pass": -11.2,
          "epa_rush": -7.2,
          "third_down_comp": 1,
          "third_down_att": 10,
          "red_zone_comp": 0,
          "red_zone_att": 1,
          "time_of_possession": "20:04"
        },
        {
          "id": "stat_det_w11",
          "game_id": "nfl_2024_w11_det_jax",
          "team_id": "nfl_DET",
          "is_home": true,
          "total_yards": 645,
          "passing_yards": 449,
          "rushing_yards": 196,
          "turnovers": 0,
          "epa_total": 36.2,
          "epa_pass": 24.1,
          "epa_rush": 12.1,
          "third_down_comp": 6,
          "third_down_att": 9,
          "red_zone_comp": 7,
          "red_zone_att": 7,
          "time_of_possession": "39:56"
        }
      ],
      "key_plays": [
        {
          "id": "play_w11_det_jax_01",
          "game_id": "nfl_2024_w11_det_jax",
          "play_id": "p_det_stbrown_td",
          "quarter": 2,
          "time_remaining": "01:14",
          "down": 3,
          "ydstogo": 4,
          "yardline": "JAX 27",
          "possession_team_id": "nfl_DET",
          "play_type": "pass",
          "description": "J.Goff pase corto al medio con A.St. Brown para 27 yardas TOUCHDOWN. Detroit anota en 7 posesiones consecutivas para liderar 28-6.",
          "epa": 3.2,
          "wp_before": 0.84,
          "wp_after": 0.99,
          "wp_swing": 0.15,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "01:14 Q2"
        }
      ],
      "trivia": [
        {
          "id": "triv_w11_det_01",
          "game_id": "nfl_2024_w11_det_jax",
          "category": "milestone",
          "fact_text": "Los Lions anotan 52 puntos, la mayor cifra en la historia de la franquicia en un partido de temporada regular moderna."
        }
      ],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w11_det_jax",
        "game_id": "nfl_2024_w11_det_jax",
        "headline": "Offensive Juggernaut & Defensive Suffocation: Detroit's Historic 46-Point Demolition",
        "narrative_summary": "The Detroit Lions established themselves as the NFC's undisputed titan in a 52-6 rout of the Jacksonville Jaguars at Ford Field. Ben Johnson's offense scored touchdowns on their first seven consecutive possessions while Aaron Glenn's defense suffocated Mac Jones, allowing only 170 total yards and generating a +46 point differential, the largest in modern franchise history.",
        "historic_facts": [
          {
            "title": "Franchise Margin of Victory",
            "description": "Detroit's 46-point victory was the largest margin of victory in the 94-year history of the Lions franchise."
          },
          {
            "title": "Total Yardage Supremacy",
            "description": "Detroit outgained Jacksonville 645 to 170 (+475 yard differential), scoring touchdowns on 7 straight drives."
          }
        ],
        "award_deep_dives": [
          {
            "role": "The Engine (Official Game MVP)",
            "player": "Jared Goff & Amon-Ra St. Brown",
            "team_code": "DET",
            "bullets": [
              {
                "label": "Historic Perfection",
                "detail": "Goff finished with 412 passing yards, 4 touchdowns, and a 158.3 maximum passer rating."
              },
              {
                "label": "St. Brown Dominance",
                "detail": "Amon-Ra recorded 11 receptions for 161 yards and 2 touchdowns."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Utilize Heavy Play-Action Motion Against Soft Cover-3",
            "logic": "Detroit's play-action pulled Jacksonville linebackers toward Montgomery and Gibbs, opening 25-yard seams."
          },
          {
            "type": "DONT",
            "strategy": "Abandon Gap Integrity Against Duo Blocking Schemes",
            "logic": "Jacksonville over-pursued on outside zone, allowing Detroit running backs cutback lanes for 196 rushing yards."
          }
        ]
      }
    },
    {
      "id": "ncaa_2024_w11_uga_ala",
      "league": "ncaa",
      "season": 2024,
      "week": 11,
      "home_code": "ALA",
      "home_name": "Alabama Crimson Tide",
      "home_short": "Alabama",
      "home_score": 41,
      "home_primary": "#9E1B32",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
      "home_conference": "SEC",
      "home_division": null,
      "away_code": "UGA",
      "away_name": "Georgia Bulldogs",
      "away_short": "Georgia",
      "away_score": 34,
      "away_primary": "#BA0C2F",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png",
      "away_conference": "SEC",
      "away_division": null,
      "status": "final",
      "venue": "Bryant-Denny Stadium",
      "weather_temp": 64,
      "weather_desc": "Noche despejada",
      "highlight_url": "https://www.youtube.com/results?search_query=Georgia+vs+Alabama+2024+highlights",
      "team_stats": [
        {
          "id": "stat_uga_w11",
          "game_id": "ncaa_2024_w11_uga_ala",
          "team_id": "ncaa_UGA",
          "is_home": false,
          "total_yards": 519,
          "passing_yards": 439,
          "rushing_yards": 80,
          "turnovers": 4,
          "epa_total": 4.8,
          "epa_pass": 8.2,
          "epa_rush": -3.4,
          "third_down_comp": 3,
          "third_down_att": 15,
          "red_zone_comp": 3,
          "red_zone_att": 4,
          "time_of_possession": "28:44"
        },
        {
          "id": "stat_ala_w11",
          "game_id": "ncaa_2024_w11_uga_ala",
          "team_id": "ncaa_ALA",
          "is_home": true,
          "total_yards": 547,
          "passing_yards": 374,
          "rushing_yards": 173,
          "turnovers": 1,
          "epa_total": 19.4,
          "epa_pass": 12.6,
          "epa_rush": 6.8,
          "third_down_comp": 6,
          "third_down_att": 12,
          "red_zone_comp": 4,
          "red_zone_att": 4,
          "time_of_possession": "31:16"
        }
      ],
      "key_plays": [
        {
          "id": "play_w11_ncaa_uga_ala_01",
          "game_id": "ncaa_2024_w11_uga_ala",
          "play_id": "p_ala_rwilliams_75yd",
          "quarter": 4,
          "time_remaining": "02:18",
          "down": 1,
          "ydstogo": 10,
          "yardline": "ALA 25",
          "possession_team_id": "ncaa_ALA",
          "play_type": "pass",
          "description": "J.Milroe pase profundo por la banda derecha con Ryan Williams quien realiza un doble giro magistral sobre dos esquineros para 75 yardas TOUCHDOWN.",
          "epa": 5.8,
          "wp_before": 0.38,
          "wp_after": 0.86,
          "wp_swing": 0.48,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "02:18 Q4"
        },
        {
          "id": "play_w11_ncaa_uga_ala_02",
          "game_id": "ncaa_2024_w11_uga_ala",
          "play_id": "p_ala_brown_int",
          "quarter": 4,
          "time_remaining": "00:43",
          "down": 1,
          "ydstogo": 10,
          "yardline": "ALA 20",
          "possession_team_id": "ncaa_UGA",
          "play_type": "pass",
          "description": "C.Beck pase al fondo de las diagonales interceptado por Z.Brown para liquidar el partido más emocionante del fútbol colegial.",
          "epa": -5.1,
          "wp_before": 0.42,
          "wp_after": 1.0,
          "wp_swing": 0.42,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "00:43 Q4"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_ncaa_2024_w11_uga_ala",
        "game_id": "ncaa_2024_w11_uga_ala",
        "headline": "SEC Instant Classic: Ryan Williams' 75-Yard Miracle Outlasts Georgia's Epic Rally",
        "narrative_summary": "In an unforgettable clash of college football titans at Bryant-Denny Stadium, Alabama held off Georgia 41-34. After surging to an astonishing 28-0 lead in the first half, Alabama surrendered the lead 34-33 late in the fourth quarter. But 17-year-old freshman phenom Ryan Williams executed a spellbinding catch, double-spin move, and 75-yard touchdown dash with 2:18 left, before safety Zabien Brown intercepted Carson Beck in the end zone to ice the victory.",
        "historic_facts": [
          {
            "title": "28-Point Overcome Almost Historic",
            "description": "Georgia nearly completed the largest comeback in SEC history, overcoming a 28-point deficit before Williams' late miracle."
          },
          {
            "title": "Carson Beck Turnovers",
            "description": "Alabama's defense forced 4 turnovers from Carson Beck (3 interceptions, 1 fumble), converting them into 21 points."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP & Game on the Line Moment",
            "player": "Zabien Brown & Malachi Moore",
            "team_code": "ALA",
            "bullets": [
              {
                "label": "Endzone Interception",
                "detail": "Brown intercepted Beck in the endzone with 43 seconds left on 1st-and-10 from the Alabama 20."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Ryan Williams & Jalen Milroe",
            "team_code": "ALA",
            "bullets": [
              {
                "label": "The 75-Yard Spin-Cycle",
                "detail": "Williams caught an over-the-shoulder ball, spun 360 degrees past Julian Humphrey, and raced into the end zone."
              },
              {
                "label": "Total Yardage",
                "detail": "Williams finished with 6 catches for 177 yards and the game-winning touchdown."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Utilize Designed QB Draws to Punish Two-Deep Safeties",
            "logic": "Milroe gashed Kirby Smart's defense for 117 rushing yards whenever Georgia dropped both safeties deep."
          },
          {
            "type": "DONT",
            "strategy": "Force Contested Boundary Jump Balls on First Down",
            "logic": "Beck's game-ending interception occurred when trying to force a fade into double coverage with 43 seconds and 2 timeouts remaining."
          }
        ]
      }
    },
    {
      "id": "ncaa_2024_w11_osu_nw",
      "league": "ncaa",
      "season": 2024,
      "week": 11,
      "home_code": "OSU",
      "home_name": "Ohio State Buckeyes",
      "home_short": "Ohio State",
      "home_score": 31,
      "home_primary": "#BB0000",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/194.png",
      "home_conference": "Big Ten",
      "home_division": null,
      "away_code": "NW",
      "away_name": "Northwestern Wildcats",
      "away_short": "Northwestern",
      "away_score": 7,
      "away_primary": "#4E2A84",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/77.png",
      "away_conference": "Big Ten",
      "away_division": null,
      "status": "final",
      "venue": "Wrigley Field (Chicago)",
      "weather_temp": 50,
      "weather_desc": "Brisa de lago 14 mph",
      "highlight_url": "https://www.youtube.com/results?search_query=Ohio+State+vs+Northwestern+Wrigley+Field+highlights",
      "team_stats": [
        {
          "id": "stat_nw_w11",
          "game_id": "ncaa_2024_w11_osu_nw",
          "team_id": "ncaa_NW",
          "is_home": false,
          "total_yards": 251,
          "passing_yards": 201,
          "rushing_yards": 50,
          "turnovers": 0,
          "epa_total": -8.6,
          "epa_pass": -4.2,
          "epa_rush": -4.4,
          "third_down_comp": 4,
          "third_down_att": 15,
          "red_zone_comp": 1,
          "red_zone_att": 2,
          "time_of_possession": "27:10"
        },
        {
          "id": "stat_osu_w11",
          "game_id": "ncaa_2024_w11_osu_nw",
          "team_id": "ncaa_OSU",
          "is_home": true,
          "total_yards": 420,
          "passing_yards": 247,
          "rushing_yards": 173,
          "turnovers": 0,
          "epa_total": 18.2,
          "epa_pass": 11.5,
          "epa_rush": 6.7,
          "third_down_comp": 6,
          "third_down_att": 10,
          "red_zone_comp": 4,
          "red_zone_att": 4,
          "time_of_possession": "32:50"
        }
      ],
      "key_plays": [],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_ncaa_2024_w11_osu_nw",
        "game_id": "ncaa_2024_w11_osu_nw",
        "headline": "Big Ten Dominance at Wrigley Field: Ohio State's Defensive Front Stifles Northwestern",
        "narrative_summary": "In a unique collegiate showcase inside Chicago's iconic Wrigley Field, Ohio State shook off a slow start to overpower Northwestern 31-7. Jim Knowles' defense adjusted to Northwestern's perimeter screen game, allowing zero points in the final three quarters while Quinshon Judkins and TreVeyon Henderson wore down the Wildcats' defensive interior with 173 rushing yards and 4 rushing touchdowns.",
        "historic_facts": [
          {
            "title": "Wrigley Field Showcase",
            "description": "The game featured baseball dugouts and ivy-covered brick walls within feet of the east endzone."
          },
          {
            "title": "Two-Headed Monster",
            "description": "Judkins and Henderson each scored twice on the ground."
          },
          {
            "title": "Defensive Lockout",
            "description": "Ohio State held Northwestern to 1.8 yards per carry on designed runs."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Sonny Styles & Jack Sawyer",
            "team_code": "OSU",
            "bullets": [
              {
                "label": "TFL Surge",
                "detail": "Recorded 8 pressures and 2 TFLs, completely neutralizing Northwestern's jet sweep packages."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Carnell Tate",
            "team_code": "OSU",
            "bullets": [
              {
                "label": "Chicago Homecoming",
                "detail": "Caught 4 passes for 52 yards and 2 touchdowns in his hometown return to Chicago."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Funnel Boundary Runs into Linebacker Scrapers",
            "logic": "Eliminated horizontal stretch plays by keeping outside edge contain tight."
          },
          {
            "type": "DONT",
            "strategy": "Rely on Single-Read Perimeter Screens Against Fast Safeties",
            "logic": "Northwestern gained negative yardage on 4 wide receiver tunnel screens."
          }
        ]
      }
    },
    {
      "id": "ncaa_2024_w11_tex_ark",
      "league": "ncaa",
      "season": 2024,
      "week": 11,
      "home_code": "ARK",
      "home_name": "Arkansas Razorbacks",
      "home_short": "Arkansas",
      "home_score": 10,
      "home_primary": "#9D2235",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png",
      "home_conference": "SEC",
      "home_division": null,
      "away_code": "TEX",
      "away_name": "Texas Longhorns",
      "away_short": "Texas",
      "away_score": 20,
      "away_primary": "#BF5700",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/251.png",
      "away_conference": "SEC",
      "away_division": null,
      "status": "final",
      "venue": "Donald W. Reynolds Razorback Stadium",
      "weather_temp": 58,
      "weather_desc": "Nublado",
      "highlight_url": "https://www.youtube.com/results?search_query=Texas+vs+Arkansas+2024+highlights",
      "team_stats": [
        {
          "id": "stat_tex_w11",
          "game_id": "ncaa_2024_w11_tex_ark",
          "team_id": "ncaa_TEX",
          "is_home": false,
          "total_yards": 315,
          "passing_yards": 176,
          "rushing_yards": 139,
          "turnovers": 0,
          "epa_total": 4.8,
          "epa_pass": 1.6,
          "epa_rush": 3.2,
          "third_down_comp": 8,
          "third_down_att": 15,
          "red_zone_comp": 3,
          "red_zone_att": 3,
          "time_of_possession": "33:22"
        },
        {
          "id": "stat_ark_w11",
          "game_id": "ncaa_2024_w11_tex_ark",
          "team_id": "ncaa_ARK",
          "is_home": true,
          "total_yards": 231,
          "passing_yards": 149,
          "rushing_yards": 82,
          "turnovers": 2,
          "epa_total": -7.5,
          "epa_pass": -3.8,
          "epa_rush": -3.7,
          "third_down_comp": 5,
          "third_down_att": 13,
          "red_zone_comp": 1,
          "red_zone_att": 2,
          "time_of_possession": "26:38"
        }
      ],
      "key_plays": [],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_ncaa_2024_w11_tex_ark",
        "game_id": "ncaa_2024_w11_tex_ark",
        "headline": "SEC Trench Warfare: Texas Smothers Arkansas in Bitter Fayetteville Revival",
        "narrative_summary": "Returning to Fayetteville as SEC rivals, Steve Sarkisian's Texas Longhorns relied on Pete Kwiatkowski's elite defense to secure a gritty 20-10 road victory. In an intensely hostile environment, Texas forced two crucial turnovers, limited Arkansas quarterback Taylen Green to 149 passing yards, and chewed up the final 6:55 of clock with a surgical 12-play ground drive led by Jaydon Blue.",
        "historic_facts": [
          {
            "title": "Southwest Conference Lore",
            "description": "First meeting between Texas and Arkansas as SEC conference opponents."
          },
          {
            "title": "Clock Squeeze",
            "description": "Texas possessed the ball for 33:22, converting 8 of 15 third downs."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Jahdae Barron",
            "team_code": "TEX",
            "bullets": [
              {
                "label": "Coverage Lockdown",
                "detail": "7 tackles, 1 INT, 2 PBUs, locking down Arkansas' primary boundary target."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Quinn Ewers",
            "team_code": "TEX",
            "bullets": [
              {
                "label": "Clutch Execution",
                "detail": "20/32 for 176 yards and 2 touchdowns with 0 turnovers in hostile Fayetteville."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Use Condensed Formations to Isolate Defensive Ends",
            "logic": "Created clean rushing lanes by bunching receivers into blocking alignments."
          },
          {
            "type": "DONT",
            "strategy": "Abandon Boundary Contain Against Mobile Dual-Threat Quarterbacks",
            "logic": "Prevented Taylen Green from breaking outside on 3rd downs."
          }
        ]
      }
    },
    {
      "id": "nfl_2024_w10_det_hou",
      "league": "nfl",
      "season": 2024,
      "week": 10,
      "home_code": "HOU",
      "home_name": "Houston Texans",
      "home_short": "Texans",
      "home_score": 23,
      "home_primary": "#03202F",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png",
      "home_conference": "AFC",
      "home_division": "South",
      "away_code": "DET",
      "away_name": "Detroit Lions",
      "away_short": "Lions",
      "away_score": 26,
      "away_primary": "#0076B6",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
      "away_conference": "NFC",
      "away_division": "North",
      "status": "final",
      "venue": "NRG Stadium",
      "weather_temp": 72,
      "weather_desc": "Techo retráctil cerrado",
      "highlight_url": "https://www.youtube.com/results?search_query=Lions+vs+Texans+Week+10+2024+highlights",
      "team_stats": [
        {
          "id": "stat_det_w10",
          "game_id": "nfl_2024_w10_det_hou",
          "team_id": "nfl_DET",
          "is_home": false,
          "total_yards": 345,
          "passing_yards": 240,
          "rushing_yards": 105,
          "turnovers": 5,
          "epa_total": -2.1,
          "epa_pass": -9.8,
          "epa_rush": 7.7,
          "third_down_comp": 4,
          "third_down_att": 12,
          "red_zone_comp": 2,
          "red_zone_att": 2,
          "time_of_possession": "31:40"
        },
        {
          "id": "stat_hou_w10",
          "game_id": "nfl_2024_w10_det_hou",
          "team_id": "nfl_HOU",
          "is_home": true,
          "total_yards": 248,
          "passing_yards": 192,
          "rushing_yards": 56,
          "turnovers": 2,
          "epa_total": -8.4,
          "epa_pass": -3.5,
          "epa_rush": -4.9,
          "third_down_comp": 6,
          "third_down_att": 15,
          "red_zone_comp": 2,
          "red_zone_att": 3,
          "time_of_possession": "28:20"
        }
      ],
      "key_plays": [
        {
          "id": "play_w10_det_hou_01",
          "game_id": "nfl_2024_w10_det_hou",
          "play_id": "p_bates_52yd_win",
          "quarter": 4,
          "time_remaining": "00:00",
          "down": 4,
          "ydstogo": 5,
          "yardline": "HOU 34",
          "possession_team_id": "nfl_DET",
          "play_type": "field_goal",
          "description": "J.Bates conecta gol de campo de 52 yardas para sellar la milagrosa victoria de Detroit tras superar 5 intercepciones y desventaja de 16 puntos.",
          "epa": 3.8,
          "wp_before": 0.56,
          "wp_after": 1.0,
          "wp_swing": 0.44,
          "is_turnover": 0,
          "is_touchdown": 0,
          "highlight_timestamp": "00:00 Q4"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w10_det_hou",
        "game_id": "nfl_2024_w10_det_hou",
        "headline": "The 5-Interception Miracle: Detroit's Second-Half Defensive Chokehold Stuns Houston",
        "narrative_summary": "In one of the most improbable comebacks in modern NFL history, the Detroit Lions overcame 5 Jared Goff interceptions to defeat the Houston Texans 26-23 at NRG Stadium. Aaron Glenn's defense pitched a complete second-half shutout against C.J. Stroud (holding Houston to 0 points and 2 interceptions over their final 8 possessions), paving the way for rookie kicker Jake Bates to blast a 58-yard equalizer and a 52-yard walk-off game-winner as time expired.",
        "historic_facts": [
          {
            "title": "54-Year Historic Anomaly",
            "description": "Detroit is the first team in 54 years to throw 5 INTs, face a 15+ point deficit, and still emerge victorious."
          },
          {
            "title": "Stroud Second-Half Lockdown",
            "description": "C.J. Stroud was held to 5-of-13 for 55 yards with 2 INTs and a 16.8 passer rating in the second half."
          },
          {
            "title": "Bates' Ice Water",
            "description": "Undrafted rookie Jake Bates nailed two 50+ yard field goals in the final five minutes."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Carlton Davis III",
            "team_code": "DET",
            "bullets": [
              {
                "label": "Turnover Catalyst",
                "detail": "Recorded 2 interceptions in the second half, including a diving pick in the endzone that ignited the comeback."
              }
            ]
          },
          {
            "role": "Special Teams of the Week",
            "player": "Jake Bates",
            "team_code": "DET",
            "bullets": [
              {
                "label": "Clutch Kick Duo",
                "detail": "Converted a 58-yarder with 5:01 left to tie and a 52-yarder at 0:00 to win."
              }
            ]
          },
          {
            "role": "The Engine",
            "player": "David Montgomery & Jahmyr Gibbs",
            "team_code": "DET",
            "bullets": [
              {
                "label": "Ground Salvation",
                "detail": "Combined for 105 yards and 2 touchdowns to steady the ship amidst passing turnovers."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Shift into Robber Bracket Coverage on 2nd-and-Long",
            "logic": "Choked C.J. Stroud's passing windows over the middle throughout the second half."
          },
          {
            "type": "DONT",
            "strategy": "Abandon the Run When the Quarterback Struggles with Interceptions",
            "logic": "Detroit stayed committed to duo blocking, allowing their defense to mount the comeback."
          }
        ]
      }
    },
    {
      "id": "nfl_2024_w10_pit_was",
      "league": "nfl",
      "season": 2024,
      "week": 10,
      "home_code": "WAS",
      "home_name": "Washington Commanders",
      "home_short": "Commanders",
      "home_score": 27,
      "home_primary": "#5A1414",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png",
      "home_conference": "NFC",
      "home_division": "East",
      "away_code": "PIT",
      "away_name": "Pittsburgh Steelers",
      "away_short": "Steelers",
      "away_score": 28,
      "away_primary": "#FFB612",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png",
      "away_conference": "AFC",
      "away_division": "North",
      "status": "final",
      "venue": "Northwest Stadium",
      "weather_temp": 59,
      "weather_desc": "Despejado",
      "highlight_url": "https://www.youtube.com/results?search_query=Steelers+vs+Commanders+Week+10+2024+highlights",
      "team_stats": [
        {
          "id": "stat_pit_w10",
          "game_id": "nfl_2024_w10_pit_was",
          "team_id": "nfl_PIT",
          "is_home": false,
          "total_yards": 312,
          "passing_yards": 172,
          "rushing_yards": 140,
          "turnovers": 1,
          "epa_total": 7.8,
          "epa_pass": 5.2,
          "epa_rush": 2.6,
          "third_down_comp": 5,
          "third_down_att": 13,
          "red_zone_comp": 3,
          "red_zone_att": 3,
          "time_of_possession": "34:11"
        },
        {
          "id": "stat_was_w10",
          "game_id": "nfl_2024_w10_pit_was",
          "team_id": "nfl_WAS",
          "is_home": true,
          "total_yards": 242,
          "passing_yards": 182,
          "rushing_yards": 60,
          "turnovers": 0,
          "epa_total": 4.1,
          "epa_pass": 3.8,
          "epa_rush": 0.3,
          "third_down_comp": 4,
          "third_down_att": 11,
          "red_zone_comp": 3,
          "red_zone_att": 3,
          "time_of_possession": "25:49"
        }
      ],
      "key_plays": [
        {
          "id": "play_w10_pit_was_01",
          "game_id": "nfl_2024_w10_pit_was",
          "play_id": "p_wilson_mwilliams_td",
          "quarter": 4,
          "time_remaining": "02:22",
          "down": 3,
          "ydstogo": 9,
          "yardline": "WAS 32",
          "possession_team_id": "nfl_PIT",
          "play_type": "pass",
          "description": "R.Wilson arco perfecto de 32 yardas a la banda con Mike Williams para el TOUCHDOWN de la remontada en su primera recepción con el equipo.",
          "epa": 4.4,
          "wp_before": 0.32,
          "wp_after": 0.71,
          "wp_swing": 0.39,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "02:22 Q4"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w10_pit_was",
        "game_id": "nfl_2024_w10_pit_was",
        "headline": "Wilson's Moonball Dagger: Pittsburgh Edge Pressure Dethrones Jayden Daniels in Washington",
        "narrative_summary": "Russell Wilson delivered vintage clutch magic at Northwest Stadium, floating a majestic 32-yard touchdown bomb to newly acquired Mike Williams with 2:22 remaining to lift Pittsburgh over the Washington Commanders 28-27. T.J. Watt and Cameron Heyward generated relentless interior and perimeter pressure on rookie sensation Jayden Daniels, capping the afternoon by stuffing Zach Ertz inches short on 4th-and-9.",
        "historic_facts": [
          {
            "title": "First Catch Miracle",
            "description": "Mike Williams had run only 9 offensive snaps in his Steelers debut before hauling in the game-winner."
          },
          {
            "title": "Jayden Daniels Contained",
            "description": "Washington's explosive rushing offense was held to a season-low 60 rushing yards."
          },
          {
            "title": "4th Down Measurement",
            "description": "The game ended on a dramatic measurement where the tip of the ball was short by less than two inches."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Cameron Heyward",
            "team_code": "PIT",
            "bullets": [
              {
                "label": "Interior Havoc",
                "detail": "2.0 sacks, 4 QB hits, and continuous penetration against Washington's interior guard tandem."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Russell Wilson",
            "team_code": "PIT",
            "bullets": [
              {
                "label": "Moonball Precision",
                "detail": "3 passing touchdowns, finishing 14-of-28 for 195 yards and zero turnovers."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Target Single Coverage with High-Arc Boundary Passes",
            "logic": "Wilson placed the ball over the outside shoulder of Mike Williams where only the 6-foot-4 receiver could reach it."
          },
          {
            "type": "DONT",
            "strategy": "Jump Offsides on 4th-and-1 Hard Counts",
            "logic": "Commanders rookie Johnny Newton jumped offsides with 1:02 left, handing Pittsburgh the clinching first down."
          }
        ]
      }
    },
    {
      "id": "ncaa_2024_w10_uga_ole",
      "league": "ncaa",
      "season": 2024,
      "week": 10,
      "home_code": "MISS",
      "home_name": "Ole Miss Rebels",
      "home_short": "Ole Miss",
      "home_score": 28,
      "home_primary": "#CE1126",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/145.png",
      "home_conference": "SEC",
      "home_division": null,
      "away_code": "UGA",
      "away_name": "Georgia Bulldogs",
      "away_short": "Georgia",
      "away_score": 10,
      "away_primary": "#BA0C2F",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png",
      "away_conference": "SEC",
      "away_division": null,
      "status": "final",
      "venue": "Vaught-Hemingway Stadium",
      "weather_temp": 62,
      "weather_desc": "Lluvia ligera",
      "highlight_url": "https://www.youtube.com/results?search_query=Georgia+vs+Ole+Miss+2024+highlights",
      "team_stats": [
        {
          "id": "stat_uga_w10",
          "game_id": "ncaa_2024_w10_uga_ole",
          "team_id": "ncaa_UGA",
          "is_home": false,
          "total_yards": 245,
          "passing_yards": 186,
          "rushing_yards": 59,
          "turnovers": 3,
          "epa_total": -14.2,
          "epa_pass": -6.8,
          "epa_rush": -7.4,
          "third_down_comp": 5,
          "third_down_att": 16,
          "red_zone_comp": 1,
          "red_zone_att": 2,
          "time_of_possession": "27:32"
        },
        {
          "id": "stat_ole_w10",
          "game_id": "ncaa_2024_w10_uga_ole",
          "team_id": "ncaa_MISS",
          "is_home": true,
          "total_yards": 395,
          "passing_yards": 261,
          "rushing_yards": 134,
          "turnovers": 1,
          "epa_total": 11.5,
          "epa_pass": 7.2,
          "epa_rush": 4.3,
          "third_down_comp": 7,
          "third_down_att": 14,
          "red_zone_comp": 3,
          "red_zone_att": 4,
          "time_of_possession": "32:28"
        }
      ],
      "key_plays": [
        {
          "id": "play_w10_uga_ole_01",
          "game_id": "ncaa_2024_w10_uga_ole",
          "play_id": "p_princely_strip_sack",
          "quarter": 3,
          "time_remaining": "06:14",
          "down": 3,
          "ydstogo": 8,
          "yardline": "UGA 31",
          "possession_team_id": "ncaa_UGA",
          "play_type": "pass",
          "description": "P.Umanmielen captura a Carson Beck por el lado ciego y provoca balón suelto recuperado por Ole Miss en zona roja.",
          "epa": -4.5,
          "wp_before": 0.38,
          "wp_after": 0.66,
          "wp_swing": 0.28,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "06:14 Q3"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_ncaa_2024_w10_uga_ole",
        "game_id": "ncaa_2024_w10_uga_ole",
        "headline": "Oxford Earthquake: Princely Umanmielen & Ole Miss Pass Rush Obliterate Georgia 28-10",
        "narrative_summary": "In the defining upset of the 2024 college football season, Pete Golding's Ole Miss defense unleashed an unremitting pass-rushing blitzkrieg against Carson Beck, sacking Georgia's quarterback 5 times and hitting him on 14 dropbacks in a 28-10 demolition in Oxford. Lane Kiffin's offense controlled tempo with Jaxson Dart while the Rebels held the Bulldogs to an abysmal 59 rushing yards.",
        "historic_facts": [
          {
            "title": "Kirby Smart Streak Broken",
            "description": "Ended Georgia's 52-game winning streak against non-Alabama opponents."
          },
          {
            "title": "Sack Festival",
            "description": "Ole Miss logged 5 sacks and 9 tackles for loss against an SEC-leading offensive line."
          },
          {
            "title": "Field Storming Tradition",
            "description": "Fans tore down both goalposts and carried them down University Avenue to The Square."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Princely Umanmielen",
            "team_code": "MISS",
            "bullets": [
              {
                "label": "Speed Rush Masterclass",
                "detail": "2.0 sacks, 1 forced fumble, 7 hurries, destroying Georgia's right tackle."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Jaxson Dart",
            "team_code": "MISS",
            "bullets": [
              {
                "label": "Toughness & Control",
                "detail": "Overcame an early ankle injury to pass for 199 yards and rush for 50 yards and a score."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Align Edge Rushers in Wide-9 Stances",
            "logic": "Exploited slow-footwork college tackles on standard pass sets with pure speed rushes."
          },
          {
            "type": "DONT",
            "strategy": "Force Boundary Passes into Cloud Coverage",
            "logic": "Carson Beck was picked off twice trying to force boundary out-routes."
          }
        ]
      }
    },
    {
      "id": "ncaa_2024_w10_ala_lsu",
      "league": "ncaa",
      "season": 2024,
      "week": 10,
      "home_code": "LSU",
      "home_name": "LSU Tigers",
      "home_short": "LSU",
      "home_score": 13,
      "home_primary": "#461D7C",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/99.png",
      "home_conference": "SEC",
      "home_division": null,
      "away_code": "ALA",
      "away_name": "Alabama Crimson Tide",
      "away_short": "Alabama",
      "away_score": 42,
      "away_primary": "#9E1B32",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
      "away_conference": "SEC",
      "away_division": null,
      "status": "final",
      "venue": "Tiger Stadium (Death Valley)",
      "weather_temp": 68,
      "weather_desc": "Tormenta nocturna",
      "highlight_url": "https://www.youtube.com/results?search_query=Alabama+vs+LSU+2024+highlights",
      "team_stats": [
        {
          "id": "stat_ala_w10",
          "game_id": "ncaa_2024_w10_ala_lsu",
          "team_id": "ncaa_ALA",
          "is_home": false,
          "total_yards": 420,
          "passing_yards": 109,
          "rushing_yards": 311,
          "turnovers": 0,
          "epa_total": 21.6,
          "epa_pass": 3.4,
          "epa_rush": 18.2,
          "third_down_comp": 10,
          "third_down_att": 14,
          "red_zone_comp": 5,
          "red_zone_att": 5,
          "time_of_possession": "34:10"
        },
        {
          "id": "stat_lsu_w10",
          "game_id": "ncaa_2024_w10_ala_lsu",
          "team_id": "ncaa_LSU",
          "is_home": true,
          "total_yards": 341,
          "passing_yards": 237,
          "rushing_yards": 104,
          "turnovers": 3,
          "epa_total": -9.8,
          "epa_pass": -4.1,
          "epa_rush": -5.7,
          "third_down_comp": 6,
          "third_down_att": 14,
          "red_zone_comp": 1,
          "red_zone_att": 4,
          "time_of_possession": "25:50"
        }
      ],
      "key_plays": [
        {
          "id": "play_w10_ala_lsu_01",
          "game_id": "ncaa_2024_w10_ala_lsu",
          "play_id": "p_milroe_72yd_run",
          "quarter": 3,
          "time_remaining": "04:20",
          "down": 2,
          "ydstogo": 6,
          "yardline": "ALA 28",
          "possession_team_id": "ncaa_ALA",
          "play_type": "rush",
          "description": "J.Milroe escapa por el centro en jugada rota y acelera 72 yardas para su cuarto TOUCHDOWN terrestre de la noche en Death Valley.",
          "epa": 5.4,
          "wp_before": 0.68,
          "wp_after": 1.0,
          "wp_swing": 0.32,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "04:20 Q3"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_ncaa_2024_w10_ala_lsu",
        "game_id": "ncaa_2024_w10_ala_lsu",
        "headline": "Death Valley Dismantling: Jalen Milroe Rushes for 4 Touchdowns as Alabama Crushes LSU 42-13",
        "narrative_summary": "Under a torrential downpour in Baton Rouge, Jalen Milroe put on an all-time dual-threat masterclass, gashing LSU's defense for 185 rushing yards and 4 touchdowns on just 12 carries (15.4 yards per carry) in a 42-13 rout. Kane Wommack's defense tormented Garrett Nussmeier with 3 turnovers and two fourth-down stops, eliminating Brian Kelly's Tigers from the SEC Championship race.",
        "historic_facts": [
          {
            "title": "4-TD Milestone",
            "description": "Milroe became the first quarterback in SEC history to rush for 4 touchdowns in Tiger Stadium."
          },
          {
            "title": "311 Rushing Yards",
            "description": "Alabama gashed LSU for 311 yards on the ground at 6.8 yards per carry."
          },
          {
            "title": "Nussmeier Red Zone Woes",
            "description": "LSU scored on only 1 of 4 trips inside Alabama's 20-yard line."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Jihaad Campbell",
            "team_code": "ALA",
            "bullets": [
              {
                "label": "Physical Dominance",
                "detail": "12 tackles, 1.5 sacks, 1 forced fumble, shutting down LSU's rushing game."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Jalen Milroe",
            "team_code": "ALA",
            "bullets": [
              {
                "label": "Historic Rush Clinic",
                "detail": "185 rushing yards, 4 touchdowns on runs of 39, 10, 19, and 72 yards."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Utilize Heavy Pulling Guards on QB Counter",
            "logic": "Gashed linebackers flowing horizontally to outside zone, creating massive cutback lanes for Milroe."
          },
          {
            "type": "DONT",
            "strategy": "Blitz Slot Cornerbacks Without Safety Rotation",
            "logic": "Leaving the middle of the field vacant enabled Milroe's 72-yard touchdown dash."
          }
        ]
      }
    },
    {
      "id": "nfl_2024_w9_den_bal",
      "league": "nfl",
      "season": 2024,
      "week": 9,
      "home_code": "BAL",
      "home_name": "Baltimore Ravens",
      "home_short": "Ravens",
      "home_score": 41,
      "home_primary": "#241773",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
      "home_conference": "AFC",
      "home_division": "North",
      "away_code": "DEN",
      "away_name": "Denver Broncos",
      "away_short": "Broncos",
      "away_score": 10,
      "away_primary": "#FB4F14",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/den.png",
      "away_conference": "AFC",
      "away_division": "West",
      "status": "final",
      "venue": "M&T Bank Stadium",
      "weather_temp": 56,
      "weather_desc": "Soleado",
      "highlight_url": "https://www.youtube.com/results?search_query=Broncos+vs+Ravens+Week+9+2024+highlights",
      "team_stats": [
        {
          "id": "stat_den_w9",
          "game_id": "nfl_2024_w9_den_bal",
          "team_id": "nfl_DEN",
          "is_home": false,
          "total_yards": 319,
          "passing_yards": 197,
          "rushing_yards": 122,
          "turnovers": 1,
          "epa_total": -10.4,
          "epa_pass": -6.2,
          "epa_rush": -4.2,
          "third_down_comp": 6,
          "third_down_att": 14,
          "red_zone_comp": 1,
          "red_zone_att": 2,
          "time_of_possession": "27:54"
        },
        {
          "id": "stat_bal_w9",
          "game_id": "nfl_2024_w9_den_bal",
          "team_id": "nfl_BAL",
          "is_home": true,
          "total_yards": 396,
          "passing_yards": 269,
          "rushing_yards": 127,
          "turnovers": 0,
          "epa_total": 28.5,
          "epa_pass": 21.2,
          "epa_rush": 7.3,
          "third_down_comp": 5,
          "third_down_att": 8,
          "red_zone_comp": 5,
          "red_zone_att": 5,
          "time_of_possession": "32:06"
        }
      ],
      "key_plays": [
        {
          "id": "play_w9_den_bal_01",
          "game_id": "nfl_2024_w9_den_bal",
          "play_id": "p_lamar_flowers_td",
          "quarter": 2,
          "time_remaining": "00:32",
          "down": 2,
          "ydstogo": 7,
          "yardline": "DEN 7",
          "possession_team_id": "nfl_BAL",
          "play_type": "pass",
          "description": "L.Jackson elude la presión y conecta pase de 7 yardas con Z.Flowers para touchdown, rumbo a una actuación perfecta con 158.3 de rating.",
          "epa": 3.1,
          "wp_before": 0.74,
          "wp_after": 0.92,
          "wp_swing": 0.18,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "00:32 Q2"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_nfl_2024_w9_den_bal",
        "game_id": "nfl_2024_w9_den_bal",
        "headline": "Rating Perfection: Lamar Jackson & Derrick Henry Decimate Denver's #3 Defense 41-10",
        "narrative_summary": "Lamar Jackson put on an absolute clinic against Vance Joseph's third-ranked Denver defense, completing 16 of 19 passes for 280 yards, 3 touchdowns, zero interceptions, and a flawless 158.3 passer rating in a 41-10 blowout at M&T Bank Stadium. Derrick Henry added 106 yards and 2 touchdowns, completely overwhelming Denver's front seven.",
        "historic_facts": [
          {
            "title": "4th Perfect Game",
            "description": "Jackson joined Tom Brady and Peyton Manning as the only quarterbacks with 4 career games with a maximum 158.3 passer rating."
          },
          {
            "title": "The Century Mark",
            "description": "Derrick Henry scored his 100th career rushing touchdown."
          },
          {
            "title": "Red Zone Efficiency",
            "description": "Baltimore scored touchdowns on all 5 of their red zone possessions."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Kyle Hamilton",
            "team_code": "BAL",
            "bullets": [
              {
                "label": "All-Around Disruption",
                "detail": "10 tackles, 1 TFL, 1 sack, neutralizing Bo Nix's checkdown reads."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Lamar Jackson",
            "team_code": "BAL",
            "bullets": [
              {
                "label": "Perfection",
                "detail": "16/19, 280 yards, 3 TDs, 0 INTs, 158.3 passer rating, +21.2 EPA."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Run Play-Action Boots Against 8-Man Boxes",
            "logic": "Denver committed safety support against Henry, allowing Flowers and Bateman wide-open intermediate crossing routes."
          },
          {
            "type": "DONT",
            "strategy": "Leave Cornerbacks on Islands Against Crossing Routes",
            "logic": "Denver cornerbacks were burned for 180 yards after the catch on crossing patterns."
          }
        ]
      }
    },
    {
      "id": "ncaa_2024_w9_osu_psu",
      "league": "ncaa",
      "season": 2024,
      "week": 9,
      "home_code": "PSU",
      "home_name": "Penn State Nittany Lions",
      "home_short": "Penn State",
      "home_score": 13,
      "home_primary": "#041E42",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/213.png",
      "home_conference": "Big Ten",
      "home_division": null,
      "away_code": "OSU",
      "away_name": "Ohio State Buckeyes",
      "away_short": "Ohio State",
      "away_score": 20,
      "away_primary": "#BB0000",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/194.png",
      "away_conference": "Big Ten",
      "away_division": null,
      "status": "final",
      "venue": "Beaver Stadium (111,030 espectadores)",
      "weather_temp": 52,
      "weather_desc": "Despejado",
      "highlight_url": "https://www.youtube.com/results?search_query=Ohio+State+vs+Penn+State+2024+highlights",
      "team_stats": [
        {
          "id": "stat_osu_w9",
          "game_id": "ncaa_2024_w9_osu_psu",
          "team_id": "ncaa_OSU",
          "is_home": false,
          "total_yards": 358,
          "passing_yards": 182,
          "rushing_yards": 176,
          "turnovers": 1,
          "epa_total": 6.8,
          "epa_pass": 2.4,
          "epa_rush": 4.4,
          "third_down_comp": 6,
          "third_down_att": 12,
          "red_zone_comp": 2,
          "red_zone_att": 3,
          "time_of_possession": "31:48"
        },
        {
          "id": "stat_psu_w9",
          "game_id": "ncaa_2024_w9_osu_psu",
          "team_id": "ncaa_PSU",
          "is_home": true,
          "total_yards": 270,
          "passing_yards": 150,
          "rushing_yards": 120,
          "turnovers": 1,
          "epa_total": -4.5,
          "epa_pass": -2.1,
          "epa_rush": -2.4,
          "third_down_comp": 3,
          "third_down_att": 11,
          "red_zone_comp": 0,
          "red_zone_att": 3,
          "time_of_possession": "28:12"
        }
      ],
      "key_plays": [
        {
          "id": "play_w9_osu_psu_01",
          "game_id": "ncaa_2024_w9_osu_psu",
          "play_id": "p_osu_goal_line_stand",
          "quarter": 4,
          "time_remaining": "05:13",
          "down": 4,
          "ydstogo": 1,
          "yardline": "OSU 1",
          "possession_team_id": "ncaa_PSU",
          "play_type": "rush",
          "description": "Defensa de Ohio State frena a Kaytron Allen en 4to down y gol en la yarda 1. Cuatro paradas consecutivas en goal-to-go ante 111,030 aficionados.",
          "epa": -6.4,
          "wp_before": 0.44,
          "wp_after": 0.92,
          "wp_swing": 0.48,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "05:13 Q4"
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "id": "analysis_ncaa_2024_w9_osu_psu",
        "game_id": "ncaa_2024_w9_osu_psu",
        "headline": "The 4-Play Goal-Line Wall: Ohio State's Defense Smothers Penn State 20-13 at Beaver Stadium",
        "narrative_summary": "Before a hostile White Out-adjacent crowd of 111,030 at Beaver Stadium, Jim Knowles' Ohio State defense etched an all-time signature stand. Trailing 20-13 with 5:13 remaining, Penn State had 1st-and-goal at the Ohio State 3-yard line. Over four consecutive plays, the Buckeyes stuffed three Kaytron Allen rushes and forced an incomplete fourth-down pass to seal the game.",
        "historic_facts": [
          {
            "title": "0 Offensive Touchdowns",
            "description": "Penn State's only touchdown came on a first-quarter pick-six by Zion Tracy."
          },
          {
            "title": "Day vs Franklin",
            "description": "Ryan Day extended his undefeated record against Penn State to 6-0."
          },
          {
            "title": "Howard's Redemption",
            "description": "Pennsylvania native Will Howard sealed the win with two first-down runs on the final drive."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP",
            "player": "Davison Igbinosun & Sonny Styles",
            "team_code": "OSU",
            "bullets": [
              {
                "label": "Endzone Interception",
                "detail": "Igbinosun snatched an interception off the receiver's helmet in the endzone."
              },
              {
                "label": "Goal-Line Wall",
                "detail": "Styles made the 3rd-and-goal tackle in the backfield."
              }
            ]
          },
          {
            "role": "The Engine (Game MVP)",
            "player": "Quinshon Judkins & Will Howard",
            "team_code": "OSU",
            "bullets": [
              {
                "label": "Physical Ground Game",
                "detail": "Combined for 145 rushing yards and continuous physical conversion on 3rd and 4th downs."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Pinch Interior Defensive Tackles on Goal-Line Stands",
            "logic": "Stuffed Kaytron Allen on three consecutive goal-to-go attempts by blowing up the A-gap."
          },
          {
            "type": "DONT",
            "strategy": "Throw Boundary Fades on 4th-and-Goal",
            "logic": "Penn State failed to utilize All-American tight end Tyler Warren on their decisive fourth-down play."
          }
        ]
      }
    },
    {
      "id": "nfl_2026_sb_sea_ne",
      "league": "nfl",
      "season": 2026,
      "week": 22,
      "home_code": "SEA",
      "home_name": "Seattle Seahawks",
      "home_short": "Seahawks",
      "home_score": 29,
      "home_primary": "#002244",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png",
      "home_conference": "NFC",
      "home_division": "West",
      "away_code": "NE",
      "away_name": "New England Patriots",
      "away_short": "Patriots",
      "away_score": 13,
      "away_primary": "#002244",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png",
      "away_conference": "AFC",
      "away_division": "East",
      "status": "final",
      "venue": "Levi's Stadium (Santa Clara, CA)",
      "weather_temp": 61,
      "weather_desc": "Tarde templada despejada",
      "highlight_url": "https://www.youtube.com/results?search_query=Super+Bowl+LX+Seahawks+vs+Patriots+highlights",
      "team_stats": [
        {
          "id": "stat_ne_sb",
          "game_id": "nfl_2026_sb_sea_ne",
          "team_id": "nfl_NE",
          "is_home": false,
          "total_yards": 218,
          "passing_yards": 142,
          "rushing_yards": 76,
          "turnovers": 3,
          "epa_total": -16.8,
          "epa_pass": -11.4,
          "epa_rush": -5.4,
          "third_down_comp": 2,
          "third_down_att": 13,
          "red_zone_comp": 1,
          "red_zone_att": 2,
          "time_of_possession": "24:18"
        },
        {
          "id": "stat_sea_sb",
          "game_id": "nfl_2026_sb_sea_ne",
          "team_id": "nfl_SEA",
          "is_home": true,
          "total_yards": 372,
          "passing_yards": 237,
          "rushing_yards": 135,
          "turnovers": 0,
          "epa_total": 19.5,
          "epa_pass": 9.8,
          "epa_rush": 9.7,
          "third_down_comp": 8,
          "third_down_att": 15,
          "red_zone_comp": 3,
          "red_zone_att": 4,
          "time_of_possession": "35:42"
        }
      ],
      "key_plays": [
        {
          "id": "play_sb_sea_ne_01",
          "game_id": "nfl_2026_sb_sea_ne",
          "play_id": "p_sea_mafe_strip_sack",
          "quarter": 2,
          "time_remaining": "03:45",
          "down": 3,
          "ydstogo": 9,
          "yardline": "NE 24",
          "possession_team_id": "nfl_NE",
          "play_type": "pass",
          "description": "B.Mafe ejecuta spin-move interior sobre el tackle derecho para forzar strip-sack sobre Drake Maye, recuperado por Seattle en la yarda 14.",
          "epa": -4.8,
          "wp_before": 0.62,
          "wp_after": 0.9,
          "wp_swing": 0.28,
          "is_turnover": 1,
          "is_touchdown": 0,
          "highlight_timestamp": "03:45 Q2"
        },
        {
          "id": "play_sb_sea_ne_02",
          "game_id": "nfl_2026_sb_sea_ne",
          "play_id": "p_sea_kwalker_34yd_td",
          "quarter": 3,
          "time_remaining": "07:15",
          "down": 1,
          "ydstogo": 10,
          "yardline": "NE 34",
          "possession_team_id": "nfl_SEA",
          "play_type": "rush",
          "description": "K.Walker III encuentra el hueco en zona exterior, rompe dos tackleadas y se escapa 34 yardas a las diagonales para ampliar la ventaja a 19-0.",
          "epa": 4.2,
          "wp_before": 0.77,
          "wp_after": 0.99,
          "wp_swing": 0.22,
          "is_turnover": 0,
          "is_touchdown": 1,
          "highlight_timestamp": "07:15 Q3"
        }
      ],
      "trivia": [
        {
          "id": "triv_sb_sea_01",
          "game_id": "nfl_2026_sb_sea_ne",
          "category": "record",
          "fact_text": "Los Seahawks son el primer campeón de Super Bowl en la historia de la NFL sin cometer una sola entrega de balón en todos los playoffs."
        }
      ],
      "tactical_analysis": {
        "id": "analysis_nfl_2026_sb_sea_ne",
        "game_id": "nfl_2026_sb_sea_ne",
        "headline": "Defensive Mastery and Tactical Supremacy: A Comprehensive Analysis of Super Bowl LX",
        "narrative_summary": "The narrative of Super Bowl LX, held on February 8, 2026, at Levi's Stadium, was defined by the relentless defensive architecture of the Seattle Seahawks. In a decisive 29-13 victory over the New England Patriots, Mike Macdonald’s 'Dark Side' defense delivered a historic performance, shutting out the Patriots for three full quarters and stifling an offense that had been prolific throughout the postseason.",
        "historic_facts": [
          {
            "title": "The Post-Half Curse",
            "description": "With New England trailing 9-0 at halftime, Super Bowl history held firm; teams that are held scoreless in the first half are now 0-15 all-time in the Super Bowl."
          },
          {
            "title": "The Perfect Champion",
            "description": "The Seahawks became the first Super Bowl champion in NFL history to complete an entire postseason run without committing a single turnover."
          },
          {
            "title": "Red Zone Suffocation",
            "description": "New England was 0-for-2 in red zone opportunities during the competitive phases of the game, forced into 6 punts and 2 turnovers."
          },
          {
            "title": "Pressure Rate Without Blitzing",
            "description": "Seattle generated a 48.6% pressure rate while rushing 5 or more defenders on only 14% of snaps."
          }
        ],
        "award_deep_dives": [
          {
            "role": "Defensive MVP (Collective)",
            "player": "Mike Macdonald's 'Dark Side' Defense",
            "team_code": "SEA",
            "bullets": [
              {
                "label": "Statistical Impact",
                "detail": "Generated 6 sacks, 21 pressures, 2 forced fumbles, and an interception while holding NE to 218 total yards."
              },
              {
                "label": "Third Down Lockdown",
                "detail": "Held New England to 2-of-13 on third down conversions."
              }
            ]
          },
          {
            "role": "Linebacker & Sack of the Game",
            "player": "Boye Mafe & Derick Hall",
            "team_code": "SEA",
            "bullets": [
              {
                "label": "Strip-Sack Climax",
                "detail": "Mafe beat the right tackle with an inside spin move to strip the football, leading directly to a Seattle touchdown."
              }
            ]
          },
          {
            "role": "Defensive Back of the Game",
            "player": "Devon Witherspoon",
            "team_code": "SEA",
            "bullets": [
              {
                "label": "Island Lockdown",
                "detail": "Targeted 5 times, allowing only 1 catch for 4 yards with 2 pass breakups in man coverage."
              }
            ]
          },
          {
            "role": "The Engine (Official Game MVP)",
            "player": "Kenneth Walker III",
            "team_code": "SEA",
            "bullets": [
              {
                "label": "Ground Domination",
                "detail": "135 rushing yards on 22 carries (6.1 YPC) with 2 touchdowns, chewing up clock throughout the second half."
              }
            ]
          }
        ],
        "tactical_dos_donts": [
          {
            "type": "DO",
            "strategy": "Disguise Pre-Snap Cover-3 Match with Simulated Creepers",
            "logic": "Confused the young quarterback by showing blitz with 6 men at the line of scrimmage then dropping two into underneath flats."
          },
          {
            "type": "DO",
            "strategy": "Establish Outside Zone Stretch to Tire Opposing Linebackers",
            "logic": "Allowed Kenneth Walker cutback lanes against an aggressive front, racking up 135 rushing yards."
          },
          {
            "type": "DONT",
            "strategy": "Call Slow-Developing Play-Action in Obvious Pass Situations",
            "logic": "Patriots surrendered 4 sacks on 7 play-action attempts due to rapid edge penetration by Seattle."
          },
          {
            "type": "DONT",
            "strategy": "Challenge Devon Witherspoon on Boundary Fades Without Leverage",
            "logic": "Resulted in 2 pass breakups and an incomplete 4th-down attempt."
          }
        ]
      }
    }
  ],
  "awards": [
    {
      "id": "mock_award_mvp_w11_1",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "MVP",
      "candidate_name": "Josh Allen (Buffalo Bills)",
      "team_id": "nfl_BUF",
      "stat_summary": "262 yds pase, 55 yds carrera, 2 TD totales | +21.4 EPA",
      "metric_value": 21.4,
      "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+Week+11+Chiefs+run",
      "rank": 1
    },
    {
      "id": "mock_award_opow_w11_1",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "OPOW",
      "candidate_name": "Josh Allen (Buffalo Bills)",
      "team_id": "nfl_BUF",
      "stat_summary": "262 yds pase, 55 yds carrera, 2 TD totales | +21.4 EPA",
      "metric_value": 21.4,
      "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+Week+11+Chiefs+run",
      "rank": 1
    },
    {
      "id": "mock_award_opow_w11_2",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "OPOW",
      "candidate_name": "Amon-Ra St. Brown (Detroit Lions)",
      "team_id": "nfl_DET",
      "stat_summary": "11 recepciones, 161 yardas, 2 Touchdowns",
      "metric_value": 16.1,
      "clip_url": "https://www.youtube.com/results?search_query=Amon-Ra+St+Brown+Week+11",
      "rank": 2
    },
    {
      "id": "mock_award_dpow_w11_1",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "DPOW",
      "candidate_name": "T.J. Watt (Pittsburgh Steelers)",
      "team_id": "nfl_PIT",
      "stat_summary": "2.5 Sacks, 1 Intercepción, 8 Tackleadas vs Ofensiva #1 de Ravens",
      "metric_value": 2.5,
      "clip_url": "https://www.youtube.com/results?search_query=TJ+Watt+vs+Ravens+Week+11",
      "rank": 1
    },
    {
      "id": "mock_award_st_w11_1",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "SPECIAL_TEAMS",
      "candidate_name": "Karl Brooks (Green Bay Packers)",
      "team_id": "nfl_GB",
      "stat_summary": "Bloqueó gol de campo de 46 yds con 0:03 restantes (WP Swing: +76.0%)",
      "metric_value": 76.0,
      "clip_url": "https://www.youtube.com/results?search_query=Karl+Brooks+blocked+field+goal",
      "rank": 1
    },
    {
      "id": "mock_award_do_w11_1",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "DO",
      "candidate_name": "Acarreo de 26 yardas de Josh Allen en 4ta y 2",
      "team_id": "nfl_BUF",
      "stat_summary": "Jugada Maestra (+4.65 EPA) rompiendo dos tackleadas para sentenciar a KC",
      "metric_value": 4.65,
      "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+touchdown+run+vs+Chiefs",
      "rank": 1
    },
    {
      "id": "mock_award_dont_w11_1",
      "league": "nfl",
      "season": 2024,
      "week": 11,
      "category": "DONT",
      "candidate_name": "Pase interceptado a Patrick Mahomes con 1:07 restante",
      "team_id": "nfl_KC",
      "stat_summary": "Error Garrafal (-4.85 EPA) forzando envío bajo presión en 4ta y 13",
      "metric_value": -4.85,
      "clip_url": "https://www.youtube.com/results?search_query=Patrick+Mahomes+interception+vs+Bills",
      "rank": 1
    },
    {
      "id": "mock_award_ncaa_w11_1",
      "league": "ncaa",
      "season": 2024,
      "week": 11,
      "category": "OPOW",
      "candidate_name": "Ryan Williams (Alabama Crimson Tide)",
      "team_id": "ncaa_ALA",
      "stat_summary": "6 recepciones, 177 yardas, acrobático TD de 75 yardas con doble giro",
      "metric_value": 17.7,
      "clip_url": "https://www.youtube.com/results?search_query=Ryan+Williams+75+yard+touchdown",
      "rank": 1
    },
    {
      "id": "mock_award_ncaa_w11_2",
      "league": "ncaa",
      "season": 2024,
      "week": 11,
      "category": "DPOW",
      "candidate_name": "Zabien Brown (Alabama Crimson Tide)",
      "team_id": "ncaa_ALA",
      "stat_summary": "Intercepción en zona de anotación con 0:43 restantes para sellar el triunfo vs Georgia",
      "metric_value": 5.0,
      "clip_url": "https://www.youtube.com/results?search_query=Zabien+Brown+interception+Georgia",
      "rank": 1
    },
    {
      "id": "mock_award_sb_1",
      "league": "nfl",
      "season": 2026,
      "week": 22,
      "category": "MVP",
      "candidate_name": "Kenneth Walker III (Seattle Seahawks)",
      "team_id": "nfl_SEA",
      "stat_summary": "135 yardas terrestres, 2 Touchdowns (6.1 YPC) | MVP de Super Bowl LX",
      "metric_value": 19.5,
      "clip_url": "https://www.youtube.com/results?search_query=Kenneth+Walker+Super+Bowl+LX",
      "rank": 1
    },
    {
      "id": "mock_award_sb_2",
      "league": "nfl",
      "season": 2026,
      "week": 22,
      "category": "DPOW",
      "candidate_name": "Defensa 'Dark Side' de Mike Macdonald (Seattle Seahawks)",
      "team_id": "nfl_SEA",
      "stat_summary": "6 sacks, 21 presiones, blanqueada durante 3 cuartos completos (19-0)",
      "metric_value": 6.0,
      "clip_url": "https://www.youtube.com/results?search_query=Mike+Macdonald+Dark+Side+defense",
      "rank": 1
    }
  ]
};

// Core Data Loader
async function loadCurrentData() {
  let gamesData = null;
  try {
    const res = await apiFetch(`/api/games?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        gamesData = data;
      }
    }
  } catch (e) {
    // Offline fallback
  }

  if (!gamesData || gamesData.length === 0) {
    gamesData = MOCK_DATA.games.filter(g =>
      g.league === state.league && g.season === state.season && g.week === state.week
    );
  }
  state.games = gamesData;

  let awardsData = null;
  try {
    const aRes = await apiFetch(`/api/awards?league=${state.league}&season=${state.season}&week=${state.week}`);
    if (aRes.ok) {
      const aData = await aRes.json();
      if (Array.isArray(aData) && aData.length > 0) {
        awardsData = aData;
      }
    }
  } catch (e) {
    // Offline fallback
  }

  if (!awardsData || awardsData.length === 0) {
    awardsData = MOCK_DATA.awards.filter(a =>
      a.league === state.league && a.season === state.season && a.week === state.week
    );
  }
  state.awards = awardsData;

  renderGames();
  renderAwards();
  if (state.view === "script") {
    loadYoutubeScript();
  }
}

async function initApp() {
  renderFilterPills();
  await loadCurrentData();
}

// Dynamic Conference / Division Filter Pills
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
    { id: "NFC North", label: "NFC North" },
  ];

  const ncaaFilters = [
    { id: "ALL", label: "Todos los Juegos" },
    { id: "SEC", label: "SEC" },
    { id: "Big Ten", label: "Big Ten" },
    { id: "Big 12", label: "Big 12" },
    { id: "ACC", label: "ACC" },
    { id: "TOP25", label: "Top 25 Rank" },
  ];

  const currentFilters = state.league === "ncaa" ? ncaaFilters : nflFilters;

  bar.innerHTML = currentFilters.map(f => `
    <button class="pill-btn ${state.divisionFilter === f.id ? 'active' : ''}" onclick="filterDivision('${f.id}')">
      ${f.label}
    </button>
  `).join("");
}

function filterDivision(div) {
  state.divisionFilter = div;
  const pills = document.querySelectorAll("#division-filters .pill-btn");
  pills.forEach(p => p.classList.remove("active"));
  if (window.event && window.event.target) {
    window.event.target.classList.add("active");
  }
  renderGames();
}

// League Switcher (NFL vs NCAA)
async function switchLeague(league) {
  state.league = league;
  const nflBtn = document.getElementById("btn-league-nfl");
  const ncaaBtn = document.getElementById("btn-league-ncaa");
  if (nflBtn) nflBtn.classList.toggle("active", league === "nfl");
  if (ncaaBtn) ncaaBtn.classList.toggle("active", league === "ncaa");

  if (league === "ncaa" && state.season === 2026) {
    state.season = 2024;
    state.week = 11;
    const weekSelect = document.getElementById("select-week");
    if (weekSelect) weekSelect.value = "11";
  }

  state.divisionFilter = "ALL";
  renderFilterPills();
  await loadCurrentData();
}

// Week Switcher (Semana 11, 10, 9, Super Bowl LX)
async function changeWeek(weekVal) {
  if (weekVal === "2026_sb") {
    state.season = 2026;
    state.week = 22;
    state.league = "nfl";
    const nflBtn = document.getElementById("btn-league-nfl");
    const ncaaBtn = document.getElementById("btn-league-ncaa");
    if (nflBtn) nflBtn.classList.add("active");
    if (ncaaBtn) ncaaBtn.classList.remove("active");
  } else {
    state.season = 2024;
    state.week = parseInt(weekVal, 10);
  }

  state.divisionFilter = "ALL";
  renderFilterPills();
  await loadCurrentData();
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

  if (view === "script") {
    loadYoutubeScript();
  }
}

// Render Games Grid
function renderGames() {
  const container = document.getElementById("games-container");
  container.innerHTML = "";

  const filtered = state.games.filter(g => {
    if (g.league !== state.league) return false;
    if (state.divisionFilter === "ALL" || state.divisionFilter === "TOP25") return true;
    if (state.divisionFilter === "AFC") return g.home_conference === "AFC" || g.away_conference === "AFC";
    if (state.divisionFilter === "NFC") return g.home_conference === "NFC" || g.away_conference === "NFC";
    if (state.divisionFilter === "SEC") return g.home_conference === "SEC" || g.away_conference === "SEC";
    if (state.divisionFilter === "Big Ten") return g.home_conference === "Big Ten" || g.away_conference === "Big Ten";
    if (state.divisionFilter === "Big 12") return g.home_conference === "Big 12" || g.away_conference === "Big 12";
    if (state.divisionFilter === "ACC") return g.home_conference === "ACC" || g.away_conference === "ACC";
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
          <span class="badge-metric badge-wp-swing">Ficha & Reporte Completo →</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Drawer Tab Switcher
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

// Render Tactical Deep Research Analysis
function renderTacticalAnalysis(analysis, game) {
  const container = document.getElementById("drawer-tactical-body");
  if (!container) return;

  if (!analysis) {
    container.innerHTML = `
      <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); text-align: center; color: var(--text-muted);">
        <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🛡️</div>
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; font-size: 0.95rem;">Análisis Táctico en Síntesis</div>
        <div style="font-size: 0.8rem; line-height: 1.5;">Los scouts y el motor analítico están procesando los datos de este encuentro. Consulta el Boxscore para ver las estadísticas EPA en vivo.</div>
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
                        ${isDo ? '🟢 DO' : '🔴 DON'T'}
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

// Open Game Detail Drawer (Instant & Guest-Accessible)
async function openGameDrawer(gameId) {
  let game = state.games.find(g => g.id === gameId) || MOCK_DATA.games.find(g => g.id === gameId);

  try {
    const res = await apiFetch(`/api/games/${gameId}`);
    if (res.ok) {
      const apiGame = await res.json();
      game = { ...game, ...apiGame };
    }
  } catch (e) {
    // Use local/fallback game
  }

  if (!game) return;

  state.activeDrawerGame = game;

  document.getElementById("drawer-venue").textContent = `${game.venue || "Estadio"} • ${game.weather_desc || ""}`;
  document.getElementById("drawer-title").textContent = `${game.away_name || game.away_code} (${game.away_score}) @ ${game.home_name || game.home_code} (${game.home_score})`;
  document.getElementById("th-away-team").textContent = game.away_code;
  document.getElementById("th-home-team").textContent = game.home_code;

  // Render Tactical Analysis Tab
  renderTacticalAnalysis(game.tactical_analysis, game);
  switchDrawerTab('tactical');

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
        <a href="${p.video_url || 'https://www.youtube.com/results?search_query=' + encodeURIComponent(p.description)}" target="_blank" rel="noopener" class="play-btn">
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
    if (res.ok) {
      const data = await res.json();
      currentGeneratedScript = data.script_markdown;

      if (data.metadata) {
        document.getElementById("script-duration-badge").textContent = `⏱️ ${data.metadata.duration_formatted} estimados`;
        document.getElementById("script-words-badge").textContent = `${data.metadata.word_count.toLocaleString()} palabras`;
      }

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
    // Fallback if backend API is offline
  }

  // Standalone offline fallback
  currentGeneratedScript = `# 🎙️ GUION DE TELEPROMPTER — GRIDIRON HUB (SEMANA ${state.week})\n\n` +
    `## ⏱️ [00:00 - 01:15] BLOQUE 1: HOOK\n"¡Bienvenidos a Gridiron Hub! Análisis táctico de alta precisión para esta jornada..."\n\n` +
    `## ⏱️ [01:15 - 05:00] BLOQUE 2: EL PARTIDO DE LA SEMANA\n"Revisión de esquemas defensivos, dos-high shells y métricas EPA..."\n\n` +
    `## ⏱️ [08:30 - 11:30] BLOQUE 4: GALA DE PREMIOS\n* MVP y Jugadores más destacados de la jornada\n\n` +
    `## ⏱️ [11:30 - 14:00] BLOQUE 5: DOs & DON'Ts\n* Aciertos tácticos y errores estratégicos de los coordinadores\n\n` +
    `## ⏱️ [14:00 - 15:00] BLOQUE 6: CIERRE & CALL TO ACTION\n"¿Cuál fue la jugada más determinante? Déjalo en comentarios. ¡Suscríbete!"`;

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
