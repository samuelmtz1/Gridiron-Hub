/**
 * Gridiron Hub - Frontend Reactive Controller
 * Connects to FastAPI Backend or operates in 100% Offline Standalone Mode.
 */

// Global State
const state = {
  league: "nfl",
  season: 2026,
  week: 1,
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
      "id": "nfl_2026_w1_bal_kc",
      "league": "nfl",
      "season": 2026,
      "week": 1,
      "home_code": "KC",
      "home_name": "Kansas City Chiefs",
      "home_short": "Chiefs",
      "home_score": 27,
      "home_primary": "#E31837",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
      "home_conference": "AFC",
      "home_division": "West",
      "away_code": "BAL",
      "away_name": "Baltimore Ravens",
      "away_short": "Ravens",
      "away_score": 20,
      "away_primary": "#241773",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
      "away_conference": "AFC",
      "away_division": "North",
      "status": "final",
      "venue": "GEHA Field at Arrowhead Stadium (Kansas City, MO)",
      "weather_temp": 74,
      "weather_desc": "Despejado templado, Viento 6 mph",
      "highlight_url": "https://www.youtube.com/results?search_query=Chiefs+vs+Ravens+Kickoff+2026+highlights",
      "team_stats": [
        {
          "epa_pass": 6.9,
          "epa_rush": 1.5,
          "epa_total": 8.4,
          "game_id": "nfl_2026_w1_bal_kc",
          "id": "stat_2026_kc_w1",
          "is_home": true,
          "passing_yards": 281,
          "red_zone_att": 4,
          "red_zone_comp": 3,
          "rushing_yards": 72,
          "team_id": "nfl_KC",
          "third_down_att": 11,
          "third_down_comp": 7,
          "time_of_possession": "30:45",
          "total_yards": 353,
          "turnovers": 1
        },
        {
          "epa_pass": 1.8,
          "epa_rush": 1.3,
          "epa_total": 3.1,
          "game_id": "nfl_2026_w1_bal_kc",
          "id": "stat_2026_bal_w1",
          "is_home": false,
          "passing_yards": 267,
          "red_zone_att": 4,
          "red_zone_comp": 2,
          "rushing_yards": 185,
          "team_id": "nfl_BAL",
          "third_down_att": 13,
          "third_down_comp": 6,
          "time_of_possession": "29:15",
          "total_yards": 452,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "Lamar Jackson pasa en la zona de anotación hacia Isaiah Likely para aparente TD de 10 yardas; tras revisión de video, el pie de Likely pisa la línea final blanca por media pulgada. Termina el juego.",
          "distance": 10,
          "down": 4,
          "epa": -4.5,
          "game_id": "nfl_2026_w1_bal_kc",
          "highlight_timestamp": "Q4 0:00",
          "id": "play_kc_bal_1",
          "is_scoring": false,
          "is_touchdown": 0,
          "is_turnover": false,
          "play_id": "play_kc_bal_1",
          "play_type": "pass",
          "possession_team_id": "nfl_KC",
          "quarter": 4,
          "time_remaining": "0:00",
          "video_url": "https://www.youtube.com/results?search_query=Isaiah+Likely+toe+review+Chiefs+Ravens+2026",
          "wp_after": 0.88,
          "wp_before": 0.5,
          "wp_swing": 0.38,
          "yardline": "KC 10",
          "ydstogo": 10
        },
        {
          "description": "Xavier Worthy acarrea 21 yardas por la banda en reversible jet sweep para touchdown en su primer toque de balón profesional en la NFL.",
          "distance": 10,
          "down": 1,
          "epa": 3.8,
          "game_id": "nfl_2026_w1_bal_kc",
          "highlight_timestamp": "Q1 5:55",
          "id": "play_kc_bal_2",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_kc_bal_2",
          "play_type": "rush",
          "possession_team_id": "nfl_KC",
          "quarter": 1,
          "time_remaining": "5:55",
          "video_url": "https://www.youtube.com/results?search_query=Xavier+Worthy+jet+sweep+TD+Chiefs+Ravens+2026",
          "wp_after": 0.68,
          "wp_before": 0.5,
          "wp_swing": 0.18,
          "yardline": "BAL 21",
          "ydstogo": 10
        },
        {
          "description": "Patrick Mahomes conecta pase profundo de 35 yardas con Xavier Worthy completamente desmarcado para TD tras fallo de asignación en la secundaria de Ravens.",
          "distance": 6,
          "down": 3,
          "epa": 4.2,
          "game_id": "nfl_2026_w1_bal_kc",
          "highlight_timestamp": "Q4 10:25",
          "id": "play_kc_bal_3",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_kc_bal_3",
          "play_type": "pass",
          "possession_team_id": "nfl_KC",
          "quarter": 4,
          "time_remaining": "10:25",
          "video_url": "https://www.youtube.com/results?search_query=Patrick+Mahomes+Xavier+Worthy+35+yard+TD+Ravens",
          "wp_after": 0.72,
          "wp_before": 0.5,
          "wp_swing": 0.22,
          "yardline": "BAL 35",
          "ydstogo": 6
        }
      ],
      "trivia": [
        {
          "category": "historic_record",
          "fact_text": "Xavier Worthy se convirtió en el primer novato de los Chiefs en anotar un touchdown por tierra y otro por recepción de más de 20 yardas en su debut profesional.",
          "game_id": "nfl_2026_w1_bal_kc",
          "id": "triv_kc_bal_1"
        },
        {
          "category": "historic_record",
          "fact_text": "Patrick Mahomes superó a Len Dawson como el líder histórico en yardas por pase de la franquicia de Kansas City Chiefs (28,507 yardas).",
          "game_id": "nfl_2026_w1_bal_kc",
          "id": "triv_kc_bal_2"
        },
        {
          "category": "historic_record",
          "fact_text": "Lamar Jackson corrió para 122 yardas, registrando el 14° juego de 100+ yardas terrestres en su carrera, el máximo para cualquier quarterback en la historia de la NFL.",
          "game_id": "nfl_2026_w1_bal_kc",
          "id": "triv_kc_bal_3"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Registró 22.3 mph en su carrera de touchdown por tierra de 21 yardas, la velocidad máxima de la Semana 1.",
                "label": "Velocidad de Ruptura"
              },
              {
                "detail": "+1.85 EPA por objetivo en toques dirigidos hacia él (2 recepciones, 47 yardas, 1 TD; 1 acarreo, 21 yardas, 1 TD).",
                "label": "Eficiencia EPA"
              }
            ],
            "player": "Xavier Worthy",
            "role": "Offensive Weapon of the Week",
            "team_code": "KC"
          },
          {
            "bullets": [
              {
                "detail": "Generó 6 presiones al QB, 1 sack y forzó un balón suelto en 3ra oportunidad conteniendo el bolsillo interno.",
                "label": "Presión Interior"
              }
            ],
            "player": "Chris Jones",
            "role": "Defensive Anchor",
            "team_code": "KC"
          }
        ],
        "game_id": "nfl_2026_w1_bal_kc",
        "headline": "Separación Milimétrica y Explosión Perimetral: La Anatomía Táctica del Kickoff 2026 entre Chiefs y Ravens",
        "historic_facts": [
          {
            "description": "Chiefs ha ganado 5 de los últimos 6 enfrentamientos ante Ravens, con un diferencial promedio de solo 4.8 puntos por juego.",
            "title": "La Maldición de los Márgenes en Arrowhead"
          },
          {
            "description": "Mahomes superó a Len Dawson convirtiéndose en el líder histórico de yardas aéreas de Kansas City con 28,507 yardas.",
            "title": "Récord de Franquicia de Patrick Mahomes"
          },
          {
            "description": "El pase revertido a Isaiah Likely representó la primera vez en la era Next Gen Stats que una anotación de último segundo es revocada por contacto milimétrico del calzado con la línea blanca final.",
            "title": "El Factor Incompletitud en Última Jugada"
          }
        ],
        "id": "analysis_nfl_2026_w1_bal_kc",
        "narrative_summary": "El telón inaugural de la temporada 2026 en Arrowhead Stadium entregó un choque decidido por centímetros en los márgenes y por la evolución del esquema ofensivo de Andy Reid. Kansas City superó 27-20 a Baltimore al neutralizar el volumen terrestre de Lamar Jackson (122 yardas) mediante una defensiva en zona match diseñada por Steve Spagnuolo que obligó a Baltimore a ejecutar series largas y castigó el juego aéreo en situaciones críticas de zona roja. La incorporación de Xavier Worthy alteró el espaciado profundo que Baltimore concedía históricamente contra KC, forzando a los safeties de Zach Orr a jugar a 15 yardas de profundidad y abriendo rutas intermedias para Rashee Rice.",
        "tactical_dos_donts": [
          {
            "logic": "Generó rutas intermedias limpias y 103 yardas a Rashee Rice en el segundo nivel.",
            "strategy": "Desplegar paquetes 12 personnel con motion cruzado para congelar a los linebackers de Ravens",
            "type": "DO"
          },
          {
            "logic": "Provocó un sack y apresuró 3 pases incompletos en el último cuarto.",
            "strategy": "Alinear a Chris Jones en técnica 3 sobre el guardia novato de Baltimore en downs de pase obvio",
            "type": "DO"
          },
          {
            "logic": "Resultó en acarreos de escape de 18 y 16 yardas que extendieron series ofensivas.",
            "strategy": "Permitir a Lamar Jackson correr en bootlegs sin cobertura 'mush rush' en la contención del lado ciego",
            "type": "DONT"
          },
          {
            "logic": "Costó el touchdown potencial del empate a Baltimore con el reloj en ceros.",
            "strategy": "Lanzar en doble cobertura hacia el poste final sin asegurar separación de pies con la línea de fondo",
            "type": "DONT"
          }
        ]
      }
    },
    {
      "id": "nfl_2026_w1_gb_phi",
      "league": "nfl",
      "season": 2026,
      "week": 1,
      "home_code": "PHI",
      "home_name": "Philadelphia Eagles",
      "home_short": "Eagles",
      "home_score": 34,
      "home_primary": "#004C54",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png",
      "home_conference": "NFC",
      "home_division": "East",
      "away_code": "GB",
      "away_name": "Green Bay Packers",
      "away_short": "Packers",
      "away_score": 29,
      "away_primary": "#203731",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png",
      "away_conference": "NFC",
      "away_division": "North",
      "status": "final",
      "venue": "Arena Corinthians (São Paulo, Brasil)",
      "weather_temp": 68,
      "weather_desc": "Húmedo templado, Césped resbaladizo",
      "highlight_url": "https://www.youtube.com/results?search_query=Packers+vs+Eagles+Brazil+São+Paulo+2026+highlights",
      "team_stats": [
        {
          "epa_pass": 1.1,
          "epa_rush": 4.1,
          "epa_total": 5.2,
          "game_id": "nfl_2026_w1_gb_phi",
          "id": "stat_2026_phi_w1",
          "is_home": true,
          "passing_yards": 278,
          "red_zone_att": 4,
          "red_zone_comp": 4,
          "rushing_yards": 132,
          "team_id": "nfl_PHI",
          "third_down_att": 12,
          "third_down_comp": 4,
          "time_of_possession": "32:50",
          "total_yards": 410,
          "turnovers": 3
        },
        {
          "epa_pass": 1.5,
          "epa_rush": 1.3,
          "epa_total": 2.8,
          "game_id": "nfl_2026_w1_gb_phi",
          "id": "stat_2026_gb_w1",
          "is_home": false,
          "passing_yards": 260,
          "red_zone_att": 4,
          "red_zone_comp": 2,
          "rushing_yards": 154,
          "team_id": "nfl_GB",
          "third_down_att": 13,
          "third_down_comp": 3,
          "time_of_possession": "27:10",
          "total_yards": 414,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "Saquon Barkley corre 11 yardas rompiendo dos tacleadas para su tercer touchdown de la noche, coronando una serie de 75 yardas.",
          "distance": 10,
          "down": 1,
          "epa": 3.9,
          "game_id": "nfl_2026_w1_gb_phi",
          "highlight_timestamp": "Q3 9:18",
          "id": "play_phi_gb_1",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_phi_gb_1",
          "play_type": "rush",
          "possession_team_id": "nfl_PHI",
          "quarter": 3,
          "time_remaining": "9:18",
          "video_url": "https://www.youtube.com/results?search_query=Saquon+Barkley+3+touchdowns+Brazil+Packers+Eagles",
          "wp_after": 0.76,
          "wp_before": 0.5,
          "wp_swing": 0.26,
          "yardline": "GB 11",
          "ydstogo": 10
        },
        {
          "description": "Jayden Reed anota TD de 70 yardas en reversible jet sweep eludiendo a tres defensores de Eagles en campo abierto en São Paulo.",
          "distance": 10,
          "down": 1,
          "epa": 4.1,
          "game_id": "nfl_2026_w1_gb_phi",
          "highlight_timestamp": "Q2 5:40",
          "id": "play_phi_gb_2",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_phi_gb_2",
          "play_type": "pass",
          "possession_team_id": "nfl_PHI",
          "quarter": 2,
          "time_remaining": "5:40",
          "video_url": "https://www.youtube.com/results?search_query=Jayden+Reed+70+yard+touchdown+Brazil+Eagles",
          "wp_after": 0.69,
          "wp_before": 0.5,
          "wp_swing": 0.19,
          "yardline": "GB 30",
          "ydstogo": 10
        },
        {
          "description": "Jordan Love es capturado en la bolsa sufriendo torsión de rodilla con 15 segundos restantes; Zack Baun cierra el triunfo en 4to down.",
          "distance": 8,
          "down": 3,
          "epa": -3.8,
          "game_id": "nfl_2026_w1_gb_phi",
          "highlight_timestamp": "Q4 0:15",
          "id": "play_phi_gb_3",
          "is_scoring": false,
          "is_touchdown": 0,
          "is_turnover": false,
          "play_id": "play_phi_gb_3",
          "play_type": "pass",
          "possession_team_id": "nfl_PHI",
          "quarter": 4,
          "time_remaining": "0:15",
          "video_url": "https://www.youtube.com/results?search_query=Zack+Baun+sack+Jordan+Love+injury+Brazil+Eagles+Packers",
          "wp_after": 0.81,
          "wp_before": 0.5,
          "wp_swing": 0.31,
          "yardline": "GB 48",
          "ydstogo": 8
        }
      ],
      "trivia": [
        {
          "category": "historic_record",
          "fact_text": "Saquon Barkley se convirtió en el primer jugador en la historia de Philadelphia Eagles en anotar 3 touchdowns en su debut con el equipo desde Terrell Owens en 2004.",
          "game_id": "nfl_2026_w1_gb_phi",
          "id": "triv_phi_gb_1"
        },
        {
          "category": "historic_record",
          "fact_text": "El encuentro en la Arena Corinthians representó el primer partido oficial de temporada regular de la NFL celebrado en Sudamérica en los 104 años de la liga.",
          "game_id": "nfl_2026_w1_gb_phi",
          "id": "triv_phi_gb_2"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "109 yardas terrestres en 24 acarreos (2 TDs) y 2 recepciones para 23 yardas (1 TD).",
                "label": "Producción Integral"
              },
              {
                "detail": "82 de sus 109 yardas terrestres fueron conseguidas tras el primer contacto defensivo.",
                "label": "Yardas Tras Contacto"
              }
            ],
            "player": "Saquon Barkley",
            "role": "Offensive Player of the Week (OPOW)",
            "team_code": "PHI"
          },
          {
            "bullets": [
              {
                "detail": "15 tacleadas combinadas y la captura en 4to down con 10 segundos restantes para sellar el juego.",
                "label": "Jugada de la Noche"
              }
            ],
            "player": "Zack Baun",
            "role": "Defensive Closer",
            "team_code": "PHI"
          }
        ],
        "game_id": "nfl_2026_w1_gb_phi",
        "headline": "El Debut Sudamericano de Saquon Barkley: Dominio en Zona Roja y Eficiencia en Terreno Resbaladizo",
        "historic_facts": [
          {
            "description": "Primer partido de la NFL disputado en Brasil ante 47,236 aficionados en la Arena Corinthians de São Paulo.",
            "title": "Hito Internacional de la NFL"
          },
          {
            "description": "109 yardas terrestres, 26 yardas aéreas y 3 anotaciones totales con un índice EPA terrestre de +0.28 por acarreo.",
            "title": "Debut de Ensueño de Barkley"
          },
          {
            "description": "Eagles convirtió el 100% de sus viajes a zona roja en 6 puntos, superando ampliamente el promedio de la liga (55%).",
            "title": "Eficacia Impecable en Zona Roja"
          }
        ],
        "id": "analysis_nfl_2026_w1_gb_phi",
        "narrative_summary": "El debut histórico de la NFL en São Paulo presentó condiciones de superficie sumamente veloces pero traicioneras en la Arena Corinthians. Philadelphia aprovechó el dinamismo de Saquon Barkley en formaciones de 'Pistol' y 'Shotgun Under Center' implementadas por el nuevo coordinador ofensivo Kellen Moore. A pesar de que Jalen Hurts sufrió dos intercepciones tempranas, la eficiencia implacable de los Eagles en la zona roja (4 touchdowns en 4 visitas dentro de la yarda 20) neutralizó la explosividad perimetral de Green Bay, culminando con la captura decisiva de Zack Baun en la serie final.",
        "tactical_dos_donts": [
          {
            "logic": "Barkley logró +4.1 EPA corriendo entre los tacles sin patinar.",
            "strategy": "Alinear corredores pesados en acarreos directos A-gap para contrarrestar la falta de tracción en césped híbrido",
            "type": "DO"
          },
          {
            "logic": "Permitió interceptar un pase y limitar a Green Bay a 3 de 13 en terceras oportunidades.",
            "strategy": "Utilizar cobertura Cover 1 Robber para cortar los cruces cortos de Christian Watson",
            "type": "DO"
          },
          {
            "logic": "Hurts sufrió dos intercepciones costosas por falta de anclaje mecánico.",
            "strategy": "Forzar pases exteriores hacia la banda sin plantar el pie de apoyo en condiciones resbaladizas",
            "type": "DONT"
          },
          {
            "logic": "Dejó a Jordan Love desprotegido provocando la captura final.",
            "strategy": "Prescindir de protección adicional de ala cerrada ante el blitz cruzado de Philadelphia en la jugada final",
            "type": "DONT"
          }
        ]
      }
    },
    {
      "id": "nfl_2026_w1_lar_det",
      "league": "nfl",
      "season": 2026,
      "week": 1,
      "home_code": "DET",
      "home_name": "Detroit Lions",
      "home_short": "Lions",
      "home_score": 26,
      "home_primary": "#0076B6",
      "home_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
      "home_conference": "NFC",
      "home_division": "North",
      "away_code": "LAR",
      "away_name": "Los Angeles Rams",
      "away_short": "Rams",
      "away_score": 20,
      "away_primary": "#003594",
      "away_logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png",
      "away_conference": "NFC",
      "away_division": "West",
      "status": "final",
      "venue": "Ford Field (Domo, Detroit, MI)",
      "weather_temp": 70,
      "weather_desc": "Clima controlado bajo techo",
      "highlight_url": "https://www.youtube.com/results?search_query=Rams+vs+Lions+Week+1+Sunday+Night+Football+2026+highlights",
      "team_stats": [
        {
          "epa_pass": 1.8,
          "epa_rush": 4.7,
          "epa_total": 6.5,
          "game_id": "nfl_2026_w1_lar_det",
          "id": "stat_2026_det_w1",
          "is_home": true,
          "passing_yards": 217,
          "red_zone_att": 4,
          "red_zone_comp": 3,
          "rushing_yards": 163,
          "team_id": "nfl_DET",
          "third_down_att": 13,
          "third_down_comp": 6,
          "time_of_possession": "34:10",
          "total_yards": 363,
          "turnovers": 1
        },
        {
          "epa_pass": 4.5,
          "epa_rush": -1.3,
          "epa_total": 3.2,
          "game_id": "nfl_2026_w1_lar_det",
          "id": "stat_2026_lar_w1",
          "is_home": false,
          "passing_yards": 317,
          "red_zone_att": 3,
          "red_zone_comp": 1,
          "rushing_yards": 83,
          "team_id": "nfl_LAR",
          "third_down_att": 13,
          "third_down_comp": 5,
          "time_of_possession": "27:32",
          "total_yards": 387,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "David Montgomery embiste por el centro para TD de 1 yarda en tiempo extra culminando una marcha demoledora de 70 yardas y 8 acarreos consecutivos.",
          "distance": 1,
          "down": 1,
          "epa": 5.1,
          "game_id": "nfl_2026_w1_lar_det",
          "highlight_timestamp": "Q5 11:24",
          "id": "play_det_lar_1",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_det_lar_1",
          "play_type": "rush",
          "possession_team_id": "nfl_DET",
          "quarter": 5,
          "time_remaining": "11:24",
          "video_url": "https://www.youtube.com/results?search_query=David+Montgomery+overtime+touchdown+Lions+Rams",
          "wp_after": 0.92,
          "wp_before": 0.5,
          "wp_swing": 0.42,
          "yardline": "LAR 1",
          "ydstogo": 1
        },
        {
          "description": "Jameson Williams se escapa en ruta vertical atrapando un bombazo de Jared Goff de 52 yardas para touchdown de Lions.",
          "distance": 7,
          "down": 2,
          "epa": 4.6,
          "game_id": "nfl_2026_w1_lar_det",
          "highlight_timestamp": "Q3 10:29",
          "id": "play_det_lar_2",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_det_lar_2",
          "play_type": "pass",
          "possession_team_id": "nfl_DET",
          "quarter": 3,
          "time_remaining": "10:29",
          "video_url": "https://www.youtube.com/results?search_query=Jameson+Williams+52+yard+TD+Lions+Rams",
          "wp_after": 0.78,
          "wp_before": 0.5,
          "wp_swing": 0.28,
          "yardline": "DET 48",
          "ydstogo": 7
        }
      ],
      "trivia": [
        {
          "category": "historic_record",
          "fact_text": "Detroit Lions ganó el volado en tiempo extra y ejecutó una serie ganadora de 70 yardas con 8 acarreos consecutivos de poder sin lanzar un solo pase.",
          "game_id": "nfl_2026_w1_lar_det",
          "id": "triv_det_lar_1"
        },
        {
          "category": "historic_record",
          "fact_text": "Cooper Kupp atrapó 14 pases para 110 yardas y un touchdown, la segunda marca más alta de recepciones en la historia de la Semana 1 de la NFL.",
          "game_id": "nfl_2026_w1_lar_det",
          "id": "triv_det_lar_2"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "91 yardas en 17 acarreos, acumulando 45 yardas y el touchdown ganador en tiempo extra.",
                "label": "Acarreos Decisivos"
              },
              {
                "detail": "Convirtió las 4 terceras oportunidades de corto yardaje que le fueron asignadas.",
                "label": "Tasa de Éxito en 3er Down"
              }
            ],
            "player": "David Montgomery",
            "role": "The Closer (Offensive Catalyst)",
            "team_code": "DET"
          },
          {
            "bullets": [
              {
                "detail": "14 recepciones para 110 yardas y 1 TD operando desde el slot contra marca hombre a hombre.",
                "label": "Consistencia de Rutas"
              }
            ],
            "player": "Cooper Kupp",
            "role": "Aerial Virtuoso",
            "team_code": "LAR"
          }
        ],
        "game_id": "nfl_2026_w1_lar_det",
        "headline": "Fuerza Bruta en Tiempo Extra: El Juego Terrestre Pesado de Ben Johnson Desgasta a la Frontal de Rams",
        "historic_facts": [
          {
            "description": "Detroit ganó el juego en tiempo extra sin realizar un solo intento de pase: 8 acarreos, 70 yardas y TD.",
            "title": "La Marcha de Poder en Prórroga"
          },
          {
            "description": "14 recepciones en 21 objetivos, absorbiendo el 43% del volumen total de pase de Matthew Stafford.",
            "title": "Volumen Histórico de Cooper Kupp"
          },
          {
            "description": "5 recepciones, 121 yardas y 1 TD profundo de 52 yardas, consolidando la faceta vertical del ataque de Detroit.",
            "title": "Explosión de Jameson Williams"
          }
        ],
        "id": "analysis_nfl_2026_w1_lar_det",
        "narrative_summary": "En una reedición ardiente del duelo de comodines, Detroit Lions impuso su identidad física ante Los Angeles Rams en Ford Field. A pesar de una brillante exhibición aérea de Matthew Stafford (317 yardas, conectando 14 veces con Cooper Kupp), la línea ofensiva de Detroit tomó el control absoluto en la prórroga. Tras ganar el volado de tiempo extra, el coordinador ofensivo Ben Johnson ordenó 8 jugadas terrestres consecutivas detrás de Penei Sewell y Frank Ragnow, aprovechando el agotamiento de la línea defensiva angelina para anotar el touchdown del triunfo.",
        "tactical_dos_donts": [
          {
            "logic": "Permitió a Detroit recorrer 70 yardas en tiempo extra sin requerir un solo pase.",
            "strategy": "Comprometerse con el juego terrestre de poder con múltiples alas cerradas (13 personnel) cuando la defensiva rival luce fatigada",
            "type": "DO"
          },
          {
            "logic": "Stafford completó 7 pases de primer down rápidos minimizando el impacto del rush rival.",
            "strategy": "Diseñar pases pantalla rápidos para Cooper Kupp para eludir el pass rush interior de Aidan Hutchinson",
            "type": "DO"
          },
          {
            "logic": "Costó un touchdown de 52 yardas a Rams en el tercer cuarto.",
            "strategy": "Intentar coberturas individuales Cover 1 sin safety profundo contra la velocidad en línea recta de Jameson Williams",
            "type": "DONT"
          },
          {
            "logic": "Provocó que Rams se conformara con goles de campo en la primera mitad.",
            "strategy": "Desperdiciar series en zona roja con acarreos laterales cuando el tackle izquierdo suplente está fuera de posición",
            "type": "DONT"
          }
        ]
      }
    },
    {
      "id": "ncaa_2026_w1_tex_mich",
      "league": "ncaa",
      "season": 2026,
      "week": 1,
      "home_code": "MICH",
      "home_name": "Michigan Wolverines",
      "home_short": "Michigan",
      "home_score": 12,
      "home_primary": "#00274C",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/130.png",
      "home_conference": "Big Ten",
      "home_division": null,
      "away_code": "TEX",
      "away_name": "Texas Longhorns",
      "away_short": "Texas",
      "away_score": 31,
      "away_primary": "#BF5700",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/251.png",
      "away_conference": "SEC",
      "away_division": null,
      "status": "final",
      "venue": "Michigan Stadium (The Big House, Ann Arbor, MI)",
      "weather_temp": 65,
      "weather_desc": "Despejado otoñal, 111,170 espectadores",
      "highlight_url": "https://www.youtube.com/results?search_query=Texas+vs+Michigan+2026+college+football+highlights",
      "team_stats": [
        {
          "epa_pass": 8.1,
          "epa_rush": 4.3,
          "epa_total": 12.4,
          "game_id": "ncaa_2026_w1_tex_mich",
          "id": "stat_2026_tex_w1",
          "is_home": false,
          "passing_yards": 246,
          "red_zone_att": 4,
          "red_zone_comp": 4,
          "rushing_yards": 143,
          "team_id": "ncaa_TEX",
          "third_down_att": 16,
          "third_down_comp": 10,
          "time_of_possession": "31:20",
          "total_yards": 389,
          "turnovers": 0
        },
        {
          "epa_pass": -2.1,
          "epa_rush": -4.7,
          "epa_total": -6.8,
          "game_id": "ncaa_2026_w1_tex_mich",
          "id": "stat_2026_mich_w1",
          "is_home": true,
          "passing_yards": 204,
          "red_zone_att": 2,
          "red_zone_comp": 1,
          "rushing_yards": 80,
          "team_id": "ncaa_MICH",
          "third_down_att": 12,
          "third_down_comp": 3,
          "time_of_possession": "28:40",
          "total_yards": 284,
          "turnovers": 3
        }
      ],
      "key_plays": [
        {
          "description": "Quinn Ewers encuentra a Gunnar Helm en pase cruzado de 21 yardas para touchdown, extendiendo la ventaja de Texas a 14-3 en The Big House.",
          "distance": 5,
          "down": 3,
          "epa": 3.8,
          "game_id": "ncaa_2026_w1_tex_mich",
          "highlight_timestamp": "Q2 8:44",
          "id": "play_tex_mich_1",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_tex_mich_1",
          "play_type": "pass",
          "possession_team_id": "ncaa_TEX",
          "quarter": 2,
          "time_remaining": "8:44",
          "video_url": "https://www.youtube.com/results?search_query=Quinn+Ewers+Gunnar+Helm+touchdown+Michigan+The+Big+House",
          "wp_after": 0.75,
          "wp_before": 0.5,
          "wp_swing": 0.25,
          "yardline": "MICH 21",
          "ydstogo": 5
        },
        {
          "description": "Defensiva de Texas fuerza balón suelto a Colston Loveland recuperado por Derek Williams Jr. en territorio de Michigan.",
          "distance": 10,
          "down": 1,
          "epa": -3.5,
          "game_id": "ncaa_2026_w1_tex_mich",
          "highlight_timestamp": "Q2 1:56",
          "id": "play_tex_mich_2",
          "is_scoring": false,
          "is_touchdown": 0,
          "is_turnover": true,
          "play_id": "play_tex_mich_2",
          "play_type": "pass",
          "possession_team_id": "ncaa_TEX",
          "quarter": 2,
          "time_remaining": "1:56",
          "video_url": "https://www.youtube.com/results?search_query=Texas+defense+fumble+Colston+Loveland+Michigan",
          "wp_after": 0.72,
          "wp_before": 0.5,
          "wp_swing": 0.22,
          "yardline": "MICH 42",
          "ydstogo": 10
        }
      ],
      "trivia": [
        {
          "category": "historic_record",
          "fact_text": "Texas puso fin a la racha de 23 victorias consecutivas como local de Michigan en The Big House, que era la racha activa más larga en todo el fútbol colegial de la NCAA.",
          "game_id": "ncaa_2026_w1_tex_mich",
          "id": "triv_tex_mich_1"
        },
        {
          "category": "historic_record",
          "fact_text": "Steve Sarkisian se convirtió en el primer entrenador visitante en vencer a Alabama en Tuscaloosa y a Michigan en Ann Arbor en temporadas consecutivas.",
          "game_id": "ncaa_2026_w1_tex_mich",
          "id": "triv_tex_mich_2"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "8 de 11 pases completados en 3ra oportunidad para 118 yardas y 2 primeros y diez clave.",
                "label": "Eficacia en 3er Down"
              },
              {
                "detail": "Lideró series anotadoras de 76, 74 y 80 yardas bajo ensordecedora presión ambiental.",
                "label": "Control de Ritmo"
              }
            ],
            "player": "Quinn Ewers",
            "role": "Offensive Player of the Week (NCAA)",
            "team_code": "TEX"
          },
          {
            "bullets": [
              {
                "detail": "1 intercepción, 2 pases defendidos y permitió apenas 14 yardas en 6 targets a su cobertura.",
                "label": "Cobertura de Ranura"
              }
            ],
            "player": "Jahdae Barron",
            "role": "Defensive Playmaker",
            "team_code": "TEX"
          }
        ],
        "game_id": "ncaa_2026_w1_tex_mich",
        "headline": "Clase Magistral de RPO y Protección: Texas Desmantela la Fortaleza de Michigan en The Big House",
        "historic_facts": [
          {
            "description": "Michigan vio truncada su racha de 23 triunfos consecutivos como local en Ann Arbor ante 111,170 espectadores.",
            "title": "Fin a la Racha Histórica de The Big House"
          },
          {
            "description": "Texas forzó 3 pérdidas de balón y no cometió ninguna entrega en 60 minutos de juego.",
            "title": "Dominio Absoluto en Turnovers"
          },
          {
            "description": "24 de 36 pases, 246 yardas, 3 touchdowns y cero intercepciones contra la defensiva colegial #1 de la nación.",
            "title": "Precisión Quirúrgica de Quinn Ewers"
          }
        ],
        "id": "analysis_ncaa_2026_w1_tex_mich",
        "narrative_summary": "En uno de los escenarios más intimidantes del deporte colegial, Steve Sarkisian y los Texas Longhorns ejecutaron una clínica táctica para derrotar 31-12 a los campeones defensores, Michigan Wolverines. Con una línea ofensiva estelar liderada por Kelvin Banks Jr., Texas neutralizó la temida frontal interior de Mason Graham y Kenneth Grant. Quinn Ewers operó con serenidad impecable, utilizando conceptos RPO (Run-Pass Option) y pases al ala cerrada Gunnar Helm para explotar las coberturas intermedias de Michigan en tercera oportunidad (10 de 16 conversiones).",
        "tactical_dos_donts": [
          {
            "logic": "Gunnar Helm acumuló 7 recepciones para 98 yardas y 1 TD.",
            "strategy": "Utilizar al ala cerrada en rutas de costura (seam) detrás del movimiento de los linebackers en RPO",
            "type": "DO"
          },
          {
            "logic": "Contuvo al ala cerrada estelar de Michigan a 22 yardas antes del último cuarto.",
            "strategy": "Doble cobertura preventiva con safety rodado sobre Colston Loveland en situaciones de pase obvio",
            "type": "DO"
          },
          {
            "logic": "Michigan fue limitado a 80 yardas terrestres en 3.1 YPC.",
            "strategy": "Intentar establecer el acarreo de poder directo (Duo) contra la línea frontal de Texas sin amenazas en el perímetro",
            "type": "DONT"
          },
          {
            "logic": "Provocó intercepción y pérdida de posición de campo decisiva para Michigan.",
            "strategy": "Lanzar al flat en rutas lentas sin engaño de play-action ante la agresividad de Jahdae Barron",
            "type": "DONT"
          }
        ]
      }
    },
    {
      "id": "ncaa_2026_w1_clem_uga",
      "league": "ncaa",
      "season": 2026,
      "week": 1,
      "home_code": "UGA",
      "home_name": "Georgia Bulldogs",
      "home_short": "Georgia",
      "home_score": 34,
      "home_primary": "#BA0C2F",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png",
      "home_conference": "SEC",
      "home_division": null,
      "away_code": "CLEM",
      "away_name": "Clemson Tigers",
      "away_short": "Clemson",
      "away_score": 3,
      "away_primary": "#F56600",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png",
      "away_conference": "ACC",
      "away_division": null,
      "status": "final",
      "venue": "Mercedes-Benz Stadium (Atlanta, GA)",
      "weather_temp": 72,
      "weather_desc": "Domo cerrado climatizado",
      "highlight_url": "https://www.youtube.com/results?search_query=Georgia+vs+Clemson+Aflac+Kickoff+2026+highlights",
      "team_stats": [
        {
          "epa_pass": 9.2,
          "epa_rush": 5.4,
          "epa_total": 14.6,
          "game_id": "ncaa_2026_w1_clem_uga",
          "id": "stat_2026_uga_w1",
          "is_home": true,
          "passing_yards": 278,
          "red_zone_att": 4,
          "red_zone_comp": 4,
          "rushing_yards": 169,
          "team_id": "ncaa_UGA",
          "third_down_att": 10,
          "third_down_comp": 5,
          "time_of_possession": "33:15",
          "total_yards": 447,
          "turnovers": 0
        },
        {
          "epa_pass": -6.4,
          "epa_rush": -4.8,
          "epa_total": -11.2,
          "game_id": "ncaa_2026_w1_clem_uga",
          "id": "stat_2026_clem_w1",
          "is_home": false,
          "passing_yards": 142,
          "red_zone_att": 1,
          "red_zone_comp": 1,
          "rushing_yards": 46,
          "team_id": "ncaa_CLEM",
          "third_down_att": 13,
          "third_down_comp": 4,
          "time_of_possession": "26:45",
          "total_yards": 188,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "Carson Beck conecta pase profundo de 31 yardas con London Humphreys para TD, rompiendo el partido a favor de Georgia 20-3.",
          "distance": 8,
          "down": 2,
          "epa": 4.4,
          "game_id": "ncaa_2026_w1_clem_uga",
          "highlight_timestamp": "Q3 6:44",
          "id": "play_uga_clem_1",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_uga_clem_1",
          "play_type": "pass",
          "possession_team_id": "ncaa_UGA",
          "quarter": 3,
          "time_remaining": "6:44",
          "video_url": "https://www.youtube.com/results?search_query=Carson+Beck+London+Humphreys+TD+Clemson+Georgia",
          "wp_after": 0.77,
          "wp_before": 0.5,
          "wp_swing": 0.27,
          "yardline": "CLEM 31",
          "ydstogo": 8
        },
        {
          "description": "Malaki Starks realiza una intercepción acrobática de espaldas sobre la banda izquierda frenando el avance de Clemson.",
          "distance": 11,
          "down": 3,
          "epa": -3.8,
          "game_id": "ncaa_2026_w1_clem_uga",
          "highlight_timestamp": "Q3 3:20",
          "id": "play_uga_clem_2",
          "is_scoring": false,
          "is_touchdown": 0,
          "is_turnover": true,
          "play_id": "play_uga_clem_2",
          "play_type": "pass",
          "possession_team_id": "ncaa_UGA",
          "quarter": 3,
          "time_remaining": "3:20",
          "video_url": "https://www.youtube.com/results?search_query=Malaki+Starks+interception+Clemson+Georgia+Aflac",
          "wp_after": 0.71,
          "wp_before": 0.5,
          "wp_swing": 0.21,
          "yardline": "UGA 45",
          "ydstogo": 11
        }
      ],
      "trivia": [
        {
          "category": "historic_record",
          "fact_text": "La victoria 34-3 de Georgia representó la mayor paliza sobre un rival rankeado en el Top 15 en un juego de apertura de temporada en la historia del programa de los Bulldogs.",
          "game_id": "ncaa_2026_w1_clem_uga",
          "id": "triv_clem_uga_1"
        },
        {
          "category": "historic_record",
          "fact_text": "Clemson suma 120 minutos consecutivos (8 cuartos completos) sin lograr anotar un solo touchdown ofensivo frente a la defensiva de Kirby Smart.",
          "game_id": "ncaa_2026_w1_clem_uga",
          "id": "triv_clem_uga_2"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Acrobacia aérea de espaldas a 38 yardas de profundidad para robar el balón sobre la línea de cal.",
                "label": "Intercepción de Highlights"
              },
              {
                "detail": "Cero recepciones permitidas en su zona durante todo el encuentro.",
                "label": "Bloqueo de Cobertura"
              }
            ],
            "player": "Malaki Starks",
            "role": "Defensive MVP of the Week",
            "team_code": "UGA"
          },
          {
            "bullets": [
              {
                "detail": "278 yardas, 2 TDs, 0 INTs y 11.2 yardas por intento en la segunda mitad.",
                "label": "Eficiencia Quirúrgica"
              }
            ],
            "player": "Carson Beck",
            "role": "Heisman Contender Performance",
            "team_code": "UGA"
          }
        ],
        "game_id": "ncaa_2026_w1_clem_uga",
        "headline": "El Rodillo de Kirby Smart: Asfixia Defensiva y Ajustes de Mike Bobo Arrollan a Clemson en Atlanta",
        "historic_facts": [
          {
            "description": "Georgia superó a Clemson 28-3 en el segundo tiempo, promediando 9.2 yardas por jugada ofensiva.",
            "title": "Parcial Demoledor de Segunda Mitad"
          },
          {
            "description": "Clemson suma 120 minutos sin touchdown ofensivo ante Kirby Smart (3 puntos en 2021, 3 puntos en 2026).",
            "title": "Sequía de Anotación de Dabo Swinney"
          },
          {
            "description": "La frontal defensiva de Georgia acumuló 7 tacleadas para pérdida de yardas y 4 capturas de mariscal.",
            "title": "Defensa por Tierra Infranqueable"
          }
        ],
        "id": "analysis_ncaa_2026_w1_clem_uga",
        "narrative_summary": "Tras una primera mitad trabada y física donde las defensivas dictaron el ritmo (6-0 al descanso), el poderío de profundidad y la flexibilidad táctica de Georgia destruyeron a Clemson en la segunda mitad con un parcial abrumador de 28-3. El safety All-American Malaki Starks encabezó una exhibición defensiva de manual en Cover 4 Match que eliminó todo el juego vertical de Cade Klubnik, mientras Carson Beck demostró su estatus de candidato al Heisman conectando 23 de 33 envíos para 278 yardas y 2 anotaciones.",
        "tactical_dos_donts": [
          {
            "logic": "Produjo touchdowns de 31 y 24 yardas en el tercer cuarto.",
            "strategy": "Ajustar al descanso abriendo formaciones 4-wide para forzar a los linebackers de Clemson a defender el espacio lateral",
            "type": "DO"
          },
          {
            "logic": "Generó 4 capturas sobre Cade Klubnik y colapso del bolsillo.",
            "strategy": "Utilizar stunts de línea defensiva con Jalon Walker entrando desde la ranura",
            "type": "DO"
          },
          {
            "logic": "Clemson completó 2 de 9 en pases profundos de más de 20 yardas.",
            "strategy": "Lanzar pases de 1-on-1 al perímetro exterior sin separación ante esquineros con ventaja de talla física",
            "type": "DONT"
          },
          {
            "logic": "Colapsó la ofensiva de los Tigers en 3er down.",
            "strategy": "Abandonar el juego terrestre temprano forzando al quarterback a soltar el balón en menos de 2.2 segundos",
            "type": "DONT"
          }
        ]
      }
    },
    {
      "id": "ncaa_2026_w1_nd_tamu",
      "league": "ncaa",
      "season": 2026,
      "week": 1,
      "home_code": "TAMU",
      "home_name": "Texas A&M Aggies",
      "home_short": "Texas A&M",
      "home_score": 13,
      "home_primary": "#500000",
      "home_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/245.png",
      "home_conference": "SEC",
      "home_division": null,
      "away_code": "ND",
      "away_name": "Notre Dame Fighting Irish",
      "away_short": "Notre Dame",
      "away_score": 23,
      "away_primary": "#0C2340",
      "away_logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/87.png",
      "away_conference": "FBS Independent",
      "away_division": null,
      "status": "final",
      "venue": "Kyle Field (College Station, TX)",
      "weather_temp": 86,
      "weather_desc": "Noche húmeda sofocante, 107,315 espectadores",
      "highlight_url": "https://www.youtube.com/results?search_query=Notre+Dame+vs+Texas+AM+Kyle+Field+2026+highlights",
      "team_stats": [
        {
          "epa_pass": 0.6,
          "epa_rush": 5.2,
          "epa_total": 5.8,
          "game_id": "ncaa_2026_w1_nd_tamu",
          "id": "stat_2026_nd_w1",
          "is_home": false,
          "passing_yards": 158,
          "red_zone_att": 3,
          "red_zone_comp": 3,
          "rushing_yards": 198,
          "team_id": "ncaa_ND",
          "third_down_att": 12,
          "third_down_comp": 5,
          "time_of_possession": "31:39",
          "total_yards": 356,
          "turnovers": 0
        },
        {
          "epa_pass": -5.1,
          "epa_rush": 0.8,
          "epa_total": -4.3,
          "game_id": "ncaa_2026_w1_nd_tamu",
          "id": "stat_2026_tamu_w1",
          "is_home": true,
          "passing_yards": 100,
          "red_zone_att": 3,
          "red_zone_comp": 2,
          "rushing_yards": 146,
          "team_id": "ncaa_TAMU",
          "third_down_att": 13,
          "third_down_comp": 4,
          "time_of_possession": "28:21",
          "total_yards": 246,
          "turnovers": 2
        }
      ],
      "key_plays": [
        {
          "description": "Jeremiyah Love encuentra un hueco por el centro, acelera y anota el touchdown decisivo de 21 yardas para Notre Dame en Kyle Field.",
          "distance": 4,
          "down": 2,
          "epa": 4.8,
          "game_id": "ncaa_2026_w1_nd_tamu",
          "highlight_timestamp": "Q4 1:54",
          "id": "play_nd_tamu_1",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_nd_tamu_1",
          "play_type": "pass",
          "possession_team_id": "ncaa_ND",
          "quarter": 4,
          "time_remaining": "1:54",
          "video_url": "https://www.youtube.com/results?search_query=Jeremiyah+Love+21+yard+TD+Kyle+Field+Notre+Dame+Texas+AM",
          "wp_after": 0.89,
          "wp_before": 0.5,
          "wp_swing": 0.39,
          "yardline": "TAMU 21",
          "ydstogo": 4
        },
        {
          "description": "Jadarian Price escapa por la banda derecha para una espectacular carrera de anotación de 47 yardas silenciando a la grada de los Aggies.",
          "distance": 10,
          "down": 1,
          "epa": 3.2,
          "game_id": "ncaa_2026_w1_nd_tamu",
          "highlight_timestamp": "Q3 4:48",
          "id": "play_nd_tamu_2",
          "is_scoring": true,
          "is_touchdown": 1,
          "is_turnover": false,
          "play_id": "play_nd_tamu_2",
          "play_type": "rush",
          "possession_team_id": "ncaa_ND",
          "quarter": 3,
          "time_remaining": "4:48",
          "video_url": "https://www.youtube.com/results?search_query=Jadarian+Price+47+yard+touchdown+Texas+AM",
          "wp_after": 0.74,
          "wp_before": 0.5,
          "wp_swing": 0.24,
          "yardline": "ND 47",
          "ydstogo": 10
        }
      ],
      "trivia": [
        {
          "category": "historic_record",
          "fact_text": "Notre Dame consiguió su primera victoria como visitante ante un equipo rankeado de la conferencia SEC desde la temporada 2004.",
          "game_id": "ncaa_2026_w1_nd_tamu",
          "id": "triv_nd_tamu_1"
        },
        {
          "category": "historic_record",
          "fact_text": "Kyle Field albergó a 107,315 fanáticos para el debut de Mike Elko, la cuarta mayor asistencia registrada en los anales del estadio de College Station.",
          "game_id": "ncaa_2026_w1_nd_tamu",
          "id": "triv_nd_tamu_2"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "91 yardas en 14 intentos con el touchdown definitorio de 21 yardas entre los tacles.",
                "label": "Acarreo Decisivo"
              },
              {
                "detail": "Generó 67 yardas después del primer contacto en la sofocante humedad texana.",
                "label": "Resistencia Física"
              }
            ],
            "player": "Jeremiyah Love",
            "role": "Game Closer & Power Back",
            "team_code": "ND"
          },
          {
            "bullets": [
              {
                "detail": "2 intercepciones combinadas y cero jugadas de más de 20 yardas permitidas por aire.",
                "label": "Dupla de Safeties"
              }
            ],
            "player": "Xavier Watts & Adon Shuler",
            "role": "Defensive Mastermind Unit",
            "team_code": "ND"
          }
        ],
        "game_id": "ncaa_2026_w1_nd_tamu",
        "headline": "Resistencia Mental y Tracción en Kyle Field: La Muralla Defensiva de Al Golden Conquista Texas A&M",
        "historic_facts": [
          {
            "description": "Primera victoria de los Fighting Irish en territorio SEC ante un rival del Top 25 en dos décadas.",
            "title": "Triunfo Histórico en Suelo SEC"
          },
          {
            "description": "Notre Dame permitió apenas 3.3 yardas por intento de pase a Conner Weigman (12 de 30 envíos).",
            "title": "Asfixia Aérea Total"
          },
          {
            "description": "Touchdown de Jeremiyah Love de 21 yardas con 1:54 restante elevó la probabilidad de victoria de ND de 61% a 100%.",
            "title": "Golpe en la Hora Cero"
          }
        ],
        "id": "analysis_ncaa_2026_w1_nd_tamu",
        "narrative_summary": "En un ambiente calcinante ante 107,315 almas en College Station, los Fighting Irish de Marcus Freeman exhibieron un temple de acero para vencer 23-13 a Texas A&M. Con una línea ofensiva novata enfrentando la hostil atmósfera de Kyle Field y el ruidoso '12th Man', el coordinador defensivo Al Golden maniató al pasador de A&M Conner Weigman, permitiendo apenas 100 yardas por pase y forzando dos intercepciones. La serie final fue rubricada por el corredor Jeremiyah Love, quien anotó el touchdown decisivo de 21 yardas con menos de dos minutos en el cronómetro.",
        "tactical_dos_donts": [
          {
            "logic": "Notre Dame no sufrió castigos de falso inicio en series clave.",
            "strategy": "Utilizar conteo silencioso visual con 'snap cadences' rítmicos para contrarrestar el ruido récord de Kyle Field",
            "type": "DO"
          },
          {
            "logic": "Acumularon 198 yardas terrestres combinadas quebrando la resistencia texana.",
            "strategy": "Alimentar a los corredores Love y Price en trayectorias interiores norte-sur en el 4to cuarto",
            "type": "DO"
          },
          {
            "logic": "Provocó 2 intercepciones a Conner Weigman.",
            "strategy": "Insistir en pases de lectura larga en 3er y largo ante el doble blitz de cornerbacks de Notre Dame",
            "type": "DONT"
          },
          {
            "logic": "Permitió el touchdown ganador de Love sin resistencia en segundo nivel.",
            "strategy": "Comprometer a los apoyadores en fintas de play-action descuidando el hueco B interior",
            "type": "DONT"
          }
        ]
      }
    },
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
          "epa_pass": -0.8,
          "epa_rush": -2.4,
          "epa_total": -3.2,
          "game_id": "nfl_2024_w11_kc_buf",
          "id": "stat_kc_w11",
          "is_home": false,
          "passing_yards": 196,
          "red_zone_att": 3,
          "red_zone_comp": 3,
          "rushing_yards": 63,
          "team_id": "nfl_KC",
          "third_down_att": 10,
          "third_down_comp": 5,
          "time_of_possession": "27:14",
          "total_yards": 259,
          "turnovers": 2
        },
        {
          "epa_pass": 9.4,
          "epa_rush": 5.4,
          "epa_total": 14.8,
          "game_id": "nfl_2024_w11_kc_buf",
          "id": "stat_buf_w11",
          "is_home": true,
          "passing_yards": 262,
          "red_zone_att": 4,
          "red_zone_comp": 3,
          "rushing_yards": 104,
          "team_id": "nfl_BUF",
          "third_down_att": 15,
          "third_down_comp": 9,
          "time_of_possession": "32:46",
          "total_yards": 366,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "J.Allen acarreo por el centro 26 yardas para TOUCHDOWN, rompiendo tackleadas de Chamarri Conner y Bryan Cook. Sella la victoria y rompe el invicto de KC.",
          "down": 4,
          "epa": 4.65,
          "game_id": "nfl_2024_w11_kc_buf",
          "highlight_timestamp": "02:17 Q4",
          "id": "play_w11_kc_buf_01",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_buf_4th_td",
          "play_type": "rush",
          "possession_team_id": "nfl_BUF",
          "quarter": 4,
          "time_remaining": "02:17",
          "wp_after": 0.99,
          "wp_before": 0.81,
          "wp_swing": 0.18,
          "yardline": "KC 26",
          "ydstogo": 2
        },
        {
          "description": "P.Mahomes pase profundo interceptado por T.Bernard en la yarda 45 de KC. Fin oficial de la racha invicta de 15 partidos de Chiefs.",
          "down": 4,
          "epa": -4.85,
          "game_id": "nfl_2024_w11_kc_buf",
          "highlight_timestamp": "01:07 Q4",
          "id": "play_w11_kc_buf_02",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_buf_bernard_int",
          "play_type": "pass",
          "possession_team_id": "nfl_KC",
          "quarter": 4,
          "time_remaining": "01:07",
          "wp_after": 0.0,
          "wp_before": 0.05,
          "wp_swing": 0.05,
          "yardline": "KC 42",
          "ydstogo": 13
        }
      ],
      "trivia": [
        {
          "category": "streak",
          "fact_text": "Los Bills rompen la racha de 15 victorias consecutivas de Patrick Mahomes (incluyendo playoffs).",
          "game_id": "nfl_2024_w11_kc_buf",
          "id": "triv_w11_buf_01"
        },
        {
          "category": "record",
          "fact_text": "Josh Allen registra su cuarta victoria en temporada regular ante Kansas City, mayor cantidad en la era Mahomes.",
          "game_id": "nfl_2024_w11_kc_buf",
          "id": "triv_w11_buf_02"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Generated 18 pressures, 3.0 sacks, 5 tackles for loss, and 8 QB hits solely with a four-man rush.",
                "label": "Statistical Impact"
              },
              {
                "detail": "Generated a 44.1% pressure rate against Mahomes without blitzing a single defensive back.",
                "label": "Pressure Rate"
              }
            ],
            "player": "The Buffalo Front Four (Collective)",
            "role": "Defensive MVP",
            "team_code": "BUF"
          },
          {
            "bullets": [
              {
                "detail": "Understood Mahomes' cadence on 4th-and-13 with 1:07 left, sinking into the robber zone to snag the clinching interception.",
                "label": "The Game-Sealing Punctuation"
              },
              {
                "detail": "Allowed only 1 completion for 6 yards on 4 targets in his coverage zone.",
                "label": "Coverage Density"
              }
            ],
            "player": "Terrel Bernard",
            "role": "Linebacker & Interception of the Game",
            "team_code": "BUF"
          },
          {
            "bullets": [
              {
                "detail": "Rousseau's speed rush on 3rd-and-9 forced Mahomes into a hurried sack-fumble.",
                "label": "Third-Quarter Strip Pressure"
              }
            ],
            "player": "Greg Rousseau & Von Miller",
            "role": "Sack of the Week & Game on the Line Moment",
            "team_code": "BUF"
          },
          {
            "bullets": [
              {
                "detail": "Targeted 6 times, allowing only 2 receptions for 18 yards with 2 pass breakups against DeAndre Hopkins.",
                "label": "Target Mitigation"
              }
            ],
            "player": "Christian Benford",
            "role": "Defensive Back of the Game",
            "team_code": "BUF"
          },
          {
            "bullets": [
              {
                "detail": "Converted 3 extra points and a 33-yard field goal amidst 14 mph crosswinds at Highmark Stadium.",
                "label": "Wind Mastery"
              }
            ],
            "player": "Tyler Bass",
            "role": "Special Teams of the Week",
            "team_code": "BUF"
          },
          {
            "bullets": [
              {
                "detail": "262 passing yards, 55 rushing yards, 2 total touchdowns, and +14.8 total EPA.",
                "label": "Volume & Efficiency"
              },
              {
                "detail": "On 4th-and-2 with 2:17 left, broke multiple tackles to score the iconic 26-yard game-winning touchdown.",
                "label": "The 26-Yard Dagger"
              }
            ],
            "player": "Josh Allen",
            "role": "The Engine (Official Game MVP)",
            "team_code": "BUF"
          }
        ],
        "game_id": "nfl_2024_w11_kc_buf",
        "headline": "Defensive Mastery and Tactical Supremacy: A Comprehensive Analysis of Chiefs @ Bills",
        "historic_facts": [
          {
            "description": "Kansas City arrived 9-0; the loss snapped their 15-game winning streak dating back to Christmas Day 2023.",
            "title": "The Undefeated Fall"
          },
          {
            "description": "Josh Allen improved to 4-1 all-time against Patrick Mahomes in regular season matchups, standing as the only quarterback in NFL history with a winning record against him (minimum 3 games).",
            "title": "Regular Season Supremacy"
          },
          {
            "description": "Leading 23-21 with 2:17 remaining, McDermott bypassed a 44-yard field goal on 4th-and-2, choosing to attack Spagnuolo's blitz rather than handing Mahomes a two-minute drill.",
            "title": "The Fourth-Down Crucible"
          },
          {
            "description": "Buffalo completed the game without committing a single turnover while picking off Mahomes twice, generating 10 critical points off takeaways.",
            "title": "Turnover Inversion"
          },
          {
            "description": "Kansas City was held without a single pass play over 25 yards, forced into 19 completions under 8 air yards.",
            "title": "Explosive Play Neutralization"
          }
        ],
        "id": "analysis_nfl_2024_w11_kc_buf",
        "narrative_summary": "The narrative of Week 11's marquee matchup at Highmark Stadium was defined by Sean McDermott's aggressive fourth-down architecture and Buffalo's disguised two-high safety shells. In a decisive 30-21 victory over the Kansas City Chiefs, the Bills dismantled Kansas City's 15-game winning streak. While Josh Allen's 26-yard touchdown rumble on 4th-and-2 served as the cinematic exclamation point, it was Buffalo's interior defense that methodically choked Patrick Mahomes' passing options, holding the Chiefs to just 259 total yards and forcing two costly interceptions.",
        "tactical_dos_donts": [
          {
            "logic": "Buffalo played Cover-4 and Cover-6 on 71% of snaps, eliminating vertical routes and forcing short checkdowns.",
            "strategy": "Deploy Two-High Shells with Robber Disguise",
            "type": "DO"
          },
          {
            "logic": "Going for it on 4th-and-2 avoided giving Mahomes the football with two minutes and a single-possession deficit.",
            "strategy": "Maintain 4th-and-Short Aggressiveness vs Heavy Blitz",
            "type": "DO"
          },
          {
            "logic": "Spagnuolo's all-out blitz cleared the middle of the field, giving Allen an open lane to scamper 26 yards for the touchdown.",
            "strategy": "Empty the Second Level with Cover-0 Blitzes vs Allen",
            "type": "DONT"
          },
          {
            "logic": "Mahomes' panic throw on 4th-and-13 into Bernard's robber coverage resulted in the game-ending interception.",
            "strategy": "Force Boundary Passes Under Interior Duress",
            "type": "DONT"
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
          "epa_pass": -3.1,
          "epa_rush": -3.3,
          "epa_total": -6.4,
          "game_id": "nfl_2024_w11_bal_pit",
          "id": "stat_bal_w11",
          "is_home": false,
          "passing_yards": 205,
          "red_zone_att": 3,
          "red_zone_comp": 1,
          "rushing_yards": 124,
          "team_id": "nfl_BAL",
          "third_down_att": 11,
          "third_down_comp": 4,
          "time_of_possession": "23:38",
          "total_yards": 329,
          "turnovers": 3
        },
        {
          "epa_pass": 0.5,
          "epa_rush": 0.7,
          "epa_total": 1.2,
          "game_id": "nfl_2024_w11_bal_pit",
          "id": "stat_pit_w11",
          "is_home": true,
          "passing_yards": 181,
          "red_zone_att": 4,
          "red_zone_comp": 0,
          "rushing_yards": 122,
          "team_id": "nfl_PIT",
          "third_down_att": 16,
          "third_down_comp": 4,
          "time_of_possession": "36:22",
          "total_yards": 303,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "D.Henry acarreo de 3 yardas. N.Herbig fuerza balón suelto, recuperado por P.Queen en la yarda 44 de BAL. Primer golpe defensivo de Pittsburgh.",
          "down": 2,
          "epa": -3.9,
          "game_id": "nfl_2024_w11_bal_pit",
          "highlight_timestamp": "13:22 Q1",
          "id": "play_w11_bal_pit_01",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_pit_fumble_henry",
          "play_type": "rush",
          "possession_team_id": "nfl_BAL",
          "quarter": 1,
          "time_remaining": "13:22",
          "wp_after": 0.71,
          "wp_before": 0.52,
          "wp_swing": 0.19,
          "yardline": "BAL 41",
          "ydstogo": 8
        },
        {
          "description": "L.Jackson intento de conversión de 2 puntos por pase/acarreo es contenido por J.Porter y D.Elliott. Detención crucial para sellar el 18-16.",
          "down": 0,
          "epa": -2.15,
          "game_id": "nfl_2024_w11_bal_pit",
          "highlight_timestamp": "01:06 Q4",
          "id": "play_w11_bal_pit_02",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_pit_2pt_stop",
          "play_type": "rush",
          "possession_team_id": "nfl_BAL",
          "quarter": 4,
          "time_remaining": "01:06",
          "wp_after": 0.96,
          "wp_before": 0.58,
          "wp_swing": 0.38,
          "yardline": "PIT 2",
          "ydstogo": 2
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Herbig punched the ball free from Derrick Henry on Baltimore's opening drive, setting an immediate tone.",
                "label": "Game-Changing Disruption"
              },
              {
                "detail": "Watt generated 7 quarterback hurries, commanding double teams on 68% of dropbacks.",
                "label": "Pressure Rate"
              }
            ],
            "player": "T.J. Watt & Nick Herbig (Edge Tandem)",
            "role": "Defensive MVP",
            "team_code": "PIT"
          },
          {
            "bullets": [
              {
                "detail": "Stripped former teammate Isaiah Likely right before halftime and recovered the fumble to set up a Boswell field goal.",
                "label": "Stripping Likely"
              },
              {
                "detail": "Finished with 10 total tackles and 1 tackle for loss in his first game against Baltimore.",
                "label": "Tackle Leadership"
              }
            ],
            "player": "Patrick Queen (Revenge Game)",
            "role": "Linebacker & Forced Fumble of the Game",
            "team_code": "PIT"
          },
          {
            "bullets": [
              {
                "detail": "Converted field goals of 32, 52, 32, 57, 27, and 50 yards in freezing conditions.",
                "label": "Six-Field Goal Siege"
              },
              {
                "detail": "Became the first kicker in Steelers franchise history with three 50+ yard field goals in a single game.",
                "label": "Franchise Record"
              }
            ],
            "player": "Chris Boswell",
            "role": "Special Teams of the Week",
            "team_code": "PIT"
          }
        ],
        "game_id": "nfl_2024_w11_bal_pit",
        "headline": "Trench Attrition & Red Zone Denial: Pittsburgh Smothers the League's #1 Offense",
        "historic_facts": [
          {
            "description": "Mike Tomlin improved to 8-1 all-time against Lamar Jackson, holding the two-time MVP to his lowest passer rating of the 2024 season (66.1).",
            "title": "Tomlin's Lamar Hex"
          },
          {
            "description": "Pittsburgh became only the second team in 2024 to win a game without scoring an offensive touchdown, fueled by 6 Chris Boswell field goals.",
            "title": "Touchdown-less Victory"
          },
          {
            "description": "Holding a 18-16 lead with 1:06 left, Pittsburgh stuffed Lamar Jackson on a designed quarterback sprint-out to preserve the win.",
            "title": "Two-Point Conversion Stand"
          }
        ],
        "id": "analysis_nfl_2024_w11_bal_pit",
        "narrative_summary": "In the NFL's premier defensive bloodbath, Mike Tomlin's Steelers delivered a tactical masterclass, toppling the Baltimore Ravens 18-16 at Acrisure Stadium. Despite scoring zero offensive touchdowns, Pittsburgh relied on Chris Boswell's leg and an impregnable front seven that contained Derrick Henry to just 65 yards and forced three crucial Baltimore turnovers.",
        "tactical_dos_donts": [
          {
            "logic": "Pittsburgh kept both outside linebackers on the contain line, holding Henry under 70 yards.",
            "strategy": "Set Hard Edge Boundaries Against Derrick Henry",
            "type": "DO"
          },
          {
            "logic": "Baltimore committed 12 penalties for 80 yards, repeatedly pushing them out of field goal range.",
            "strategy": "Commit Pre-Snap Penalties in Enemy Territory",
            "type": "DONT"
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
          "epa_pass": 4.8,
          "epa_rush": 1.4,
          "epa_total": 6.2,
          "game_id": "nfl_2024_w11_gb_chi",
          "id": "stat_gb_w11",
          "is_home": false,
          "passing_yards": 260,
          "red_zone_att": 2,
          "red_zone_comp": 2,
          "rushing_yards": 106,
          "team_id": "nfl_GB",
          "third_down_att": 5,
          "third_down_comp": 3,
          "time_of_possession": "24:03",
          "total_yards": 366,
          "turnovers": 1
        },
        {
          "epa_pass": 2.1,
          "epa_rush": 2.4,
          "epa_total": 4.5,
          "game_id": "nfl_2024_w11_gb_chi",
          "id": "stat_chi_w11",
          "is_home": true,
          "passing_yards": 212,
          "red_zone_att": 3,
          "red_zone_comp": 2,
          "rushing_yards": 179,
          "team_id": "nfl_CHI",
          "third_down_att": 16,
          "third_down_comp": 9,
          "time_of_possession": "35:57",
          "total_yards": 391,
          "turnovers": 0
        }
      ],
      "key_plays": [
        {
          "description": "C.Santos intento de gol de campo de 46 yardas es BLOQUEADO por K.Brooks por el centro. Green Bay mantiene viva la racha histórica sobre Chicago con reloj en ceros.",
          "down": 4,
          "epa": -4.2,
          "game_id": "nfl_2024_w11_gb_chi",
          "highlight_timestamp": "00:00 Q4",
          "id": "play_w11_gb_chi_01",
          "is_touchdown": 0,
          "is_turnover": 0,
          "play_id": "p_gb_block_fg",
          "play_type": "field_goal",
          "possession_team_id": "nfl_CHI",
          "quarter": 4,
          "time_remaining": "00:03",
          "wp_after": 1.0,
          "wp_before": 0.24,
          "wp_swing": 0.76,
          "yardline": "GB 28",
          "ydstogo": 6
        }
      ],
      "trivia": [
        {
          "category": "historical",
          "fact_text": "Green Bay extiende a 11 partidos consecutivos su dominio invicto sobre los Bears, la racha activa más larga de la rivalidad.",
          "game_id": "nfl_2024_w11_gb_chi",
          "id": "triv_w11_gb_01"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Brooks timed the snap perfectly, slicing between Bears interior linemen Scott and Jenkins to get a glove on the ball.",
                "label": "Fingertip Miracle"
              },
              {
                "detail": "The Packers' block unit generated a 2-yard push into the Bears' backfield.",
                "label": "Trench Penetration"
              }
            ],
            "player": "Karl Brooks & Field Goal Block Unit",
            "role": "Defensive MVP & Game on the Line Moment",
            "team_code": "GB"
          },
          {
            "bullets": [
              {
                "detail": "Caught 4 passes for 150 yards, including a 60-yard diving bomb that set up the Packers' go-ahead score.",
                "label": "Explosive Playmaker"
              }
            ],
            "player": "Christian Watson",
            "role": "The Engine (Game MVP)",
            "team_code": "GB"
          }
        ],
        "game_id": "nfl_2024_w11_gb_chi",
        "headline": "Special Teams Miracle & Trench Penetration: Karl Brooks' Block Stuns Soldier Field",
        "historic_facts": [
          {
            "description": "Green Bay extended their win streak over Chicago to 11 consecutive games, the longest streak in the history of the 103-year rivalry.",
            "title": "Historic Rivalry Streak"
          },
          {
            "description": "It marked Green Bay's first blocked game-winning field goal attempt at 0:00 since 1999.",
            "title": "The Final Second Block"
          }
        ],
        "id": "analysis_nfl_2024_w11_gb_chi",
        "narrative_summary": "In the 209th chapter of the NFL's oldest rivalry, the Green Bay Packers escaped Soldier Field with a 20-19 victory after defensive lineman Karl Brooks penetrated the Bears' field goal protection unit to block Cairo Santos' 46-yard attempt with zeros on the clock. While rookie Caleb Williams orchestrated an impressive 4th-quarter comeback drive, Chicago's premature decision to settle for a long kick on first down proved fatal.",
        "tactical_dos_donts": [
          {
            "logic": "Rich Bisaccia's special teams scheme exploited low trajectory angles from Santos' middle range.",
            "strategy": "Overload the Interior A-Gap on Field Goal Protection",
            "type": "DO"
          },
          {
            "logic": "Chicago had 30 seconds and a timeout, but elected to run down the clock instead of gaining an extra 5-10 yards for a safer kick.",
            "strategy": "Settle for a 46-Yard Field Goal on 1st Down with 30 Seconds Left",
            "type": "DONT"
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
          "epa_pass": -11.2,
          "epa_rush": -7.2,
          "epa_total": -18.4,
          "game_id": "nfl_2024_w11_det_jax",
          "id": "stat_jax_w11",
          "is_home": false,
          "passing_yards": 129,
          "red_zone_att": 1,
          "red_zone_comp": 0,
          "rushing_yards": 41,
          "team_id": "nfl_JAX",
          "third_down_att": 10,
          "third_down_comp": 1,
          "time_of_possession": "20:04",
          "total_yards": 170,
          "turnovers": 1
        },
        {
          "epa_pass": 24.1,
          "epa_rush": 12.1,
          "epa_total": 36.2,
          "game_id": "nfl_2024_w11_det_jax",
          "id": "stat_det_w11",
          "is_home": true,
          "passing_yards": 449,
          "red_zone_att": 7,
          "red_zone_comp": 7,
          "rushing_yards": 196,
          "team_id": "nfl_DET",
          "third_down_att": 9,
          "third_down_comp": 6,
          "time_of_possession": "39:56",
          "total_yards": 645,
          "turnovers": 0
        }
      ],
      "key_plays": [
        {
          "description": "J.Goff pase corto al medio con A.St. Brown para 27 yardas TOUCHDOWN. Detroit anota en 7 posesiones consecutivas para liderar 28-6.",
          "down": 3,
          "epa": 3.2,
          "game_id": "nfl_2024_w11_det_jax",
          "highlight_timestamp": "01:14 Q2",
          "id": "play_w11_det_jax_01",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_det_stbrown_td",
          "play_type": "pass",
          "possession_team_id": "nfl_DET",
          "quarter": 2,
          "time_remaining": "01:14",
          "wp_after": 0.99,
          "wp_before": 0.84,
          "wp_swing": 0.15,
          "yardline": "JAX 27",
          "ydstogo": 4
        }
      ],
      "trivia": [
        {
          "category": "milestone",
          "fact_text": "Los Lions anotan 52 puntos, la mayor cifra en la historia de la franquicia en un partido de temporada regular moderna.",
          "game_id": "nfl_2024_w11_det_jax",
          "id": "triv_w11_det_01"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Goff finished with 412 passing yards, 4 touchdowns, and a 158.3 maximum passer rating.",
                "label": "Historic Perfection"
              },
              {
                "detail": "Amon-Ra recorded 11 receptions for 161 yards and 2 touchdowns.",
                "label": "St. Brown Dominance"
              }
            ],
            "player": "Jared Goff & Amon-Ra St. Brown",
            "role": "The Engine (Official Game MVP)",
            "team_code": "DET"
          }
        ],
        "game_id": "nfl_2024_w11_det_jax",
        "headline": "Offensive Juggernaut & Defensive Suffocation: Detroit's Historic 46-Point Demolition",
        "historic_facts": [
          {
            "description": "Detroit's 46-point victory was the largest margin of victory in the 94-year history of the Lions franchise.",
            "title": "Franchise Margin of Victory"
          },
          {
            "description": "Detroit outgained Jacksonville 645 to 170 (+475 yard differential), scoring touchdowns on 7 straight drives.",
            "title": "Total Yardage Supremacy"
          }
        ],
        "id": "analysis_nfl_2024_w11_det_jax",
        "narrative_summary": "The Detroit Lions established themselves as the NFC's undisputed titan in a 52-6 rout of the Jacksonville Jaguars at Ford Field. Ben Johnson's offense scored touchdowns on their first seven consecutive possessions while Aaron Glenn's defense suffocated Mac Jones, allowing only 170 total yards and generating a +46 point differential, the largest in modern franchise history.",
        "tactical_dos_donts": [
          {
            "logic": "Detroit's play-action pulled Jacksonville linebackers toward Montgomery and Gibbs, opening 25-yard seams.",
            "strategy": "Utilize Heavy Play-Action Motion Against Soft Cover-3",
            "type": "DO"
          },
          {
            "logic": "Jacksonville over-pursued on outside zone, allowing Detroit running backs cutback lanes for 196 rushing yards.",
            "strategy": "Abandon Gap Integrity Against Duo Blocking Schemes",
            "type": "DONT"
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
          "epa_pass": 8.2,
          "epa_rush": -3.4,
          "epa_total": 4.8,
          "game_id": "ncaa_2024_w11_uga_ala",
          "id": "stat_uga_w11",
          "is_home": false,
          "passing_yards": 439,
          "red_zone_att": 4,
          "red_zone_comp": 3,
          "rushing_yards": 80,
          "team_id": "ncaa_UGA",
          "third_down_att": 15,
          "third_down_comp": 3,
          "time_of_possession": "28:44",
          "total_yards": 519,
          "turnovers": 4
        },
        {
          "epa_pass": 12.6,
          "epa_rush": 6.8,
          "epa_total": 19.4,
          "game_id": "ncaa_2024_w11_uga_ala",
          "id": "stat_ala_w11",
          "is_home": true,
          "passing_yards": 374,
          "red_zone_att": 4,
          "red_zone_comp": 4,
          "rushing_yards": 173,
          "team_id": "ncaa_ALA",
          "third_down_att": 12,
          "third_down_comp": 6,
          "time_of_possession": "31:16",
          "total_yards": 547,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "J.Milroe pase profundo por la banda derecha con Ryan Williams quien realiza un doble giro magistral sobre dos esquineros para 75 yardas TOUCHDOWN.",
          "down": 1,
          "epa": 5.8,
          "game_id": "ncaa_2024_w11_uga_ala",
          "highlight_timestamp": "02:18 Q4",
          "id": "play_w11_ncaa_uga_ala_01",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_ala_rwilliams_75yd",
          "play_type": "pass",
          "possession_team_id": "ncaa_ALA",
          "quarter": 4,
          "time_remaining": "02:18",
          "wp_after": 0.86,
          "wp_before": 0.38,
          "wp_swing": 0.48,
          "yardline": "ALA 25",
          "ydstogo": 10
        },
        {
          "description": "C.Beck pase al fondo de las diagonales interceptado por Z.Brown para liquidar el partido más emocionante del fútbol colegial.",
          "down": 1,
          "epa": -5.1,
          "game_id": "ncaa_2024_w11_uga_ala",
          "highlight_timestamp": "00:43 Q4",
          "id": "play_w11_ncaa_uga_ala_02",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_ala_brown_int",
          "play_type": "pass",
          "possession_team_id": "ncaa_UGA",
          "quarter": 4,
          "time_remaining": "00:43",
          "wp_after": 1.0,
          "wp_before": 0.42,
          "wp_swing": 0.42,
          "yardline": "ALA 20",
          "ydstogo": 10
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Brown intercepted Beck in the endzone with 43 seconds left on 1st-and-10 from the Alabama 20.",
                "label": "Endzone Interception"
              }
            ],
            "player": "Zabien Brown & Malachi Moore",
            "role": "Defensive MVP & Game on the Line Moment",
            "team_code": "ALA"
          },
          {
            "bullets": [
              {
                "detail": "Williams caught an over-the-shoulder ball, spun 360 degrees past Julian Humphrey, and raced into the end zone.",
                "label": "The 75-Yard Spin-Cycle"
              },
              {
                "detail": "Williams finished with 6 catches for 177 yards and the game-winning touchdown.",
                "label": "Total Yardage"
              }
            ],
            "player": "Ryan Williams & Jalen Milroe",
            "role": "The Engine (Game MVP)",
            "team_code": "ALA"
          }
        ],
        "game_id": "ncaa_2024_w11_uga_ala",
        "headline": "SEC Instant Classic: Ryan Williams' 75-Yard Miracle Outlasts Georgia's Epic Rally",
        "historic_facts": [
          {
            "description": "Georgia nearly completed the largest comeback in SEC history, overcoming a 28-point deficit before Williams' late miracle.",
            "title": "28-Point Overcome Almost Historic"
          },
          {
            "description": "Alabama's defense forced 4 turnovers from Carson Beck (3 interceptions, 1 fumble), converting them into 21 points.",
            "title": "Carson Beck Turnovers"
          }
        ],
        "id": "analysis_ncaa_2024_w11_uga_ala",
        "narrative_summary": "In an unforgettable clash of college football titans at Bryant-Denny Stadium, Alabama held off Georgia 41-34. After surging to an astonishing 28-0 lead in the first half, Alabama surrendered the lead 34-33 late in the fourth quarter. But 17-year-old freshman phenom Ryan Williams executed a spellbinding catch, double-spin move, and 75-yard touchdown dash with 2:18 left, before safety Zabien Brown intercepted Carson Beck in the end zone to ice the victory.",
        "tactical_dos_donts": [
          {
            "logic": "Milroe gashed Kirby Smart's defense for 117 rushing yards whenever Georgia dropped both safeties deep.",
            "strategy": "Utilize Designed QB Draws to Punish Two-Deep Safeties",
            "type": "DO"
          },
          {
            "logic": "Beck's game-ending interception occurred when trying to force a fade into double coverage with 43 seconds and 2 timeouts remaining.",
            "strategy": "Force Contested Boundary Jump Balls on First Down",
            "type": "DONT"
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
          "epa_pass": -4.2,
          "epa_rush": -4.4,
          "epa_total": -8.6,
          "game_id": "ncaa_2024_w11_osu_nw",
          "id": "stat_nw_w11",
          "is_home": false,
          "passing_yards": 201,
          "red_zone_att": 2,
          "red_zone_comp": 1,
          "rushing_yards": 50,
          "team_id": "ncaa_NW",
          "third_down_att": 15,
          "third_down_comp": 4,
          "time_of_possession": "27:10",
          "total_yards": 251,
          "turnovers": 0
        },
        {
          "epa_pass": 11.5,
          "epa_rush": 6.7,
          "epa_total": 18.2,
          "game_id": "ncaa_2024_w11_osu_nw",
          "id": "stat_osu_w11",
          "is_home": true,
          "passing_yards": 247,
          "red_zone_att": 4,
          "red_zone_comp": 4,
          "rushing_yards": 173,
          "team_id": "ncaa_OSU",
          "third_down_att": 10,
          "third_down_comp": 6,
          "time_of_possession": "32:50",
          "total_yards": 420,
          "turnovers": 0
        }
      ],
      "key_plays": [],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Recorded 8 pressures and 2 TFLs, completely neutralizing Northwestern's jet sweep packages.",
                "label": "TFL Surge"
              }
            ],
            "player": "Sonny Styles & Jack Sawyer",
            "role": "Defensive MVP",
            "team_code": "OSU"
          },
          {
            "bullets": [
              {
                "detail": "Caught 4 passes for 52 yards and 2 touchdowns in his hometown return to Chicago.",
                "label": "Chicago Homecoming"
              }
            ],
            "player": "Carnell Tate",
            "role": "The Engine (Game MVP)",
            "team_code": "OSU"
          }
        ],
        "game_id": "ncaa_2024_w11_osu_nw",
        "headline": "Big Ten Dominance at Wrigley Field: Ohio State's Defensive Front Stifles Northwestern",
        "historic_facts": [
          {
            "description": "The game featured baseball dugouts and ivy-covered brick walls within feet of the east endzone.",
            "title": "Wrigley Field Showcase"
          },
          {
            "description": "Judkins and Henderson each scored twice on the ground.",
            "title": "Two-Headed Monster"
          },
          {
            "description": "Ohio State held Northwestern to 1.8 yards per carry on designed runs.",
            "title": "Defensive Lockout"
          }
        ],
        "id": "analysis_ncaa_2024_w11_osu_nw",
        "narrative_summary": "In a unique collegiate showcase inside Chicago's iconic Wrigley Field, Ohio State shook off a slow start to overpower Northwestern 31-7. Jim Knowles' defense adjusted to Northwestern's perimeter screen game, allowing zero points in the final three quarters while Quinshon Judkins and TreVeyon Henderson wore down the Wildcats' defensive interior with 173 rushing yards and 4 rushing touchdowns.",
        "tactical_dos_donts": [
          {
            "logic": "Eliminated horizontal stretch plays by keeping outside edge contain tight.",
            "strategy": "Funnel Boundary Runs into Linebacker Scrapers",
            "type": "DO"
          },
          {
            "logic": "Northwestern gained negative yardage on 4 wide receiver tunnel screens.",
            "strategy": "Rely on Single-Read Perimeter Screens Against Fast Safeties",
            "type": "DONT"
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
          "epa_pass": 1.6,
          "epa_rush": 3.2,
          "epa_total": 4.8,
          "game_id": "ncaa_2024_w11_tex_ark",
          "id": "stat_tex_w11",
          "is_home": false,
          "passing_yards": 176,
          "red_zone_att": 3,
          "red_zone_comp": 3,
          "rushing_yards": 139,
          "team_id": "ncaa_TEX",
          "third_down_att": 15,
          "third_down_comp": 8,
          "time_of_possession": "33:22",
          "total_yards": 315,
          "turnovers": 0
        },
        {
          "epa_pass": -3.8,
          "epa_rush": -3.7,
          "epa_total": -7.5,
          "game_id": "ncaa_2024_w11_tex_ark",
          "id": "stat_ark_w11",
          "is_home": true,
          "passing_yards": 149,
          "red_zone_att": 2,
          "red_zone_comp": 1,
          "rushing_yards": 82,
          "team_id": "ncaa_ARK",
          "third_down_att": 13,
          "third_down_comp": 5,
          "time_of_possession": "26:38",
          "total_yards": 231,
          "turnovers": 2
        }
      ],
      "key_plays": [],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "7 tackles, 1 INT, 2 PBUs, locking down Arkansas' primary boundary target.",
                "label": "Coverage Lockdown"
              }
            ],
            "player": "Jahdae Barron",
            "role": "Defensive MVP",
            "team_code": "TEX"
          },
          {
            "bullets": [
              {
                "detail": "20/32 for 176 yards and 2 touchdowns with 0 turnovers in hostile Fayetteville.",
                "label": "Clutch Execution"
              }
            ],
            "player": "Quinn Ewers",
            "role": "The Engine (Game MVP)",
            "team_code": "TEX"
          }
        ],
        "game_id": "ncaa_2024_w11_tex_ark",
        "headline": "SEC Trench Warfare: Texas Smothers Arkansas in Bitter Fayetteville Revival",
        "historic_facts": [
          {
            "description": "First meeting between Texas and Arkansas as SEC conference opponents.",
            "title": "Southwest Conference Lore"
          },
          {
            "description": "Texas possessed the ball for 33:22, converting 8 of 15 third downs.",
            "title": "Clock Squeeze"
          }
        ],
        "id": "analysis_ncaa_2024_w11_tex_ark",
        "narrative_summary": "Returning to Fayetteville as SEC rivals, Steve Sarkisian's Texas Longhorns relied on Pete Kwiatkowski's elite defense to secure a gritty 20-10 road victory. In an intensely hostile environment, Texas forced two crucial turnovers, limited Arkansas quarterback Taylen Green to 149 passing yards, and chewed up the final 6:55 of clock with a surgical 12-play ground drive led by Jaydon Blue.",
        "tactical_dos_donts": [
          {
            "logic": "Created clean rushing lanes by bunching receivers into blocking alignments.",
            "strategy": "Use Condensed Formations to Isolate Defensive Ends",
            "type": "DO"
          },
          {
            "logic": "Prevented Taylen Green from breaking outside on 3rd downs.",
            "strategy": "Abandon Boundary Contain Against Mobile Dual-Threat Quarterbacks",
            "type": "DONT"
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
          "epa_pass": -9.8,
          "epa_rush": 7.7,
          "epa_total": -2.1,
          "game_id": "nfl_2024_w10_det_hou",
          "id": "stat_det_w10",
          "is_home": false,
          "passing_yards": 240,
          "red_zone_att": 2,
          "red_zone_comp": 2,
          "rushing_yards": 105,
          "team_id": "nfl_DET",
          "third_down_att": 12,
          "third_down_comp": 4,
          "time_of_possession": "31:40",
          "total_yards": 345,
          "turnovers": 5
        },
        {
          "epa_pass": -3.5,
          "epa_rush": -4.9,
          "epa_total": -8.4,
          "game_id": "nfl_2024_w10_det_hou",
          "id": "stat_hou_w10",
          "is_home": true,
          "passing_yards": 192,
          "red_zone_att": 3,
          "red_zone_comp": 2,
          "rushing_yards": 56,
          "team_id": "nfl_HOU",
          "third_down_att": 15,
          "third_down_comp": 6,
          "time_of_possession": "28:20",
          "total_yards": 248,
          "turnovers": 2
        }
      ],
      "key_plays": [
        {
          "description": "J.Bates conecta gol de campo de 52 yardas para sellar la milagrosa victoria de Detroit tras superar 5 intercepciones y desventaja de 16 puntos.",
          "down": 4,
          "epa": 3.8,
          "game_id": "nfl_2024_w10_det_hou",
          "highlight_timestamp": "00:00 Q4",
          "id": "play_w10_det_hou_01",
          "is_touchdown": 0,
          "is_turnover": 0,
          "play_id": "p_bates_52yd_win",
          "play_type": "field_goal",
          "possession_team_id": "nfl_DET",
          "quarter": 4,
          "time_remaining": "00:00",
          "wp_after": 1.0,
          "wp_before": 0.56,
          "wp_swing": 0.44,
          "yardline": "HOU 34",
          "ydstogo": 5
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Recorded 2 interceptions in the second half, including a diving pick in the endzone that ignited the comeback.",
                "label": "Turnover Catalyst"
              }
            ],
            "player": "Carlton Davis III",
            "role": "Defensive MVP",
            "team_code": "DET"
          },
          {
            "bullets": [
              {
                "detail": "Converted a 58-yarder with 5:01 left to tie and a 52-yarder at 0:00 to win.",
                "label": "Clutch Kick Duo"
              }
            ],
            "player": "Jake Bates",
            "role": "Special Teams of the Week",
            "team_code": "DET"
          },
          {
            "bullets": [
              {
                "detail": "Combined for 105 yards and 2 touchdowns to steady the ship amidst passing turnovers.",
                "label": "Ground Salvation"
              }
            ],
            "player": "David Montgomery & Jahmyr Gibbs",
            "role": "The Engine",
            "team_code": "DET"
          }
        ],
        "game_id": "nfl_2024_w10_det_hou",
        "headline": "The 5-Interception Miracle: Detroit's Second-Half Defensive Chokehold Stuns Houston",
        "historic_facts": [
          {
            "description": "Detroit is the first team in 54 years to throw 5 INTs, face a 15+ point deficit, and still emerge victorious.",
            "title": "54-Year Historic Anomaly"
          },
          {
            "description": "C.J. Stroud was held to 5-of-13 for 55 yards with 2 INTs and a 16.8 passer rating in the second half.",
            "title": "Stroud Second-Half Lockdown"
          },
          {
            "description": "Undrafted rookie Jake Bates nailed two 50+ yard field goals in the final five minutes.",
            "title": "Bates' Ice Water"
          }
        ],
        "id": "analysis_nfl_2024_w10_det_hou",
        "narrative_summary": "In one of the most improbable comebacks in modern NFL history, the Detroit Lions overcame 5 Jared Goff interceptions to defeat the Houston Texans 26-23 at NRG Stadium. Aaron Glenn's defense pitched a complete second-half shutout against C.J. Stroud (holding Houston to 0 points and 2 interceptions over their final 8 possessions), paving the way for rookie kicker Jake Bates to blast a 58-yard equalizer and a 52-yard walk-off game-winner as time expired.",
        "tactical_dos_donts": [
          {
            "logic": "Choked C.J. Stroud's passing windows over the middle throughout the second half.",
            "strategy": "Shift into Robber Bracket Coverage on 2nd-and-Long",
            "type": "DO"
          },
          {
            "logic": "Detroit stayed committed to duo blocking, allowing their defense to mount the comeback.",
            "strategy": "Abandon the Run When the Quarterback Struggles with Interceptions",
            "type": "DONT"
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
          "epa_pass": 5.2,
          "epa_rush": 2.6,
          "epa_total": 7.8,
          "game_id": "nfl_2024_w10_pit_was",
          "id": "stat_pit_w10",
          "is_home": false,
          "passing_yards": 172,
          "red_zone_att": 3,
          "red_zone_comp": 3,
          "rushing_yards": 140,
          "team_id": "nfl_PIT",
          "third_down_att": 13,
          "third_down_comp": 5,
          "time_of_possession": "34:11",
          "total_yards": 312,
          "turnovers": 1
        },
        {
          "epa_pass": 3.8,
          "epa_rush": 0.3,
          "epa_total": 4.1,
          "game_id": "nfl_2024_w10_pit_was",
          "id": "stat_was_w10",
          "is_home": true,
          "passing_yards": 182,
          "red_zone_att": 3,
          "red_zone_comp": 3,
          "rushing_yards": 60,
          "team_id": "nfl_WAS",
          "third_down_att": 11,
          "third_down_comp": 4,
          "time_of_possession": "25:49",
          "total_yards": 242,
          "turnovers": 0
        }
      ],
      "key_plays": [
        {
          "description": "R.Wilson arco perfecto de 32 yardas a la banda con Mike Williams para el TOUCHDOWN de la remontada en su primera recepción con el equipo.",
          "down": 3,
          "epa": 4.4,
          "game_id": "nfl_2024_w10_pit_was",
          "highlight_timestamp": "02:22 Q4",
          "id": "play_w10_pit_was_01",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_wilson_mwilliams_td",
          "play_type": "pass",
          "possession_team_id": "nfl_PIT",
          "quarter": 4,
          "time_remaining": "02:22",
          "wp_after": 0.71,
          "wp_before": 0.32,
          "wp_swing": 0.39,
          "yardline": "WAS 32",
          "ydstogo": 9
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "2.0 sacks, 4 QB hits, and continuous penetration against Washington's interior guard tandem.",
                "label": "Interior Havoc"
              }
            ],
            "player": "Cameron Heyward",
            "role": "Defensive MVP",
            "team_code": "PIT"
          },
          {
            "bullets": [
              {
                "detail": "3 passing touchdowns, finishing 14-of-28 for 195 yards and zero turnovers.",
                "label": "Moonball Precision"
              }
            ],
            "player": "Russell Wilson",
            "role": "The Engine (Game MVP)",
            "team_code": "PIT"
          }
        ],
        "game_id": "nfl_2024_w10_pit_was",
        "headline": "Wilson's Moonball Dagger: Pittsburgh Edge Pressure Dethrones Jayden Daniels in Washington",
        "historic_facts": [
          {
            "description": "Mike Williams had run only 9 offensive snaps in his Steelers debut before hauling in the game-winner.",
            "title": "First Catch Miracle"
          },
          {
            "description": "Washington's explosive rushing offense was held to a season-low 60 rushing yards.",
            "title": "Jayden Daniels Contained"
          },
          {
            "description": "The game ended on a dramatic measurement where the tip of the ball was short by less than two inches.",
            "title": "4th Down Measurement"
          }
        ],
        "id": "analysis_nfl_2024_w10_pit_was",
        "narrative_summary": "Russell Wilson delivered vintage clutch magic at Northwest Stadium, floating a majestic 32-yard touchdown bomb to newly acquired Mike Williams with 2:22 remaining to lift Pittsburgh over the Washington Commanders 28-27. T.J. Watt and Cameron Heyward generated relentless interior and perimeter pressure on rookie sensation Jayden Daniels, capping the afternoon by stuffing Zach Ertz inches short on 4th-and-9.",
        "tactical_dos_donts": [
          {
            "logic": "Wilson placed the ball over the outside shoulder of Mike Williams where only the 6-foot-4 receiver could reach it.",
            "strategy": "Target Single Coverage with High-Arc Boundary Passes",
            "type": "DO"
          },
          {
            "logic": "Commanders rookie Johnny Newton jumped offsides with 1:02 left, handing Pittsburgh the clinching first down.",
            "strategy": "Jump Offsides on 4th-and-1 Hard Counts",
            "type": "DONT"
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
          "epa_pass": -6.8,
          "epa_rush": -7.4,
          "epa_total": -14.2,
          "game_id": "ncaa_2024_w10_uga_ole",
          "id": "stat_uga_w10",
          "is_home": false,
          "passing_yards": 186,
          "red_zone_att": 2,
          "red_zone_comp": 1,
          "rushing_yards": 59,
          "team_id": "ncaa_UGA",
          "third_down_att": 16,
          "third_down_comp": 5,
          "time_of_possession": "27:32",
          "total_yards": 245,
          "turnovers": 3
        },
        {
          "epa_pass": 7.2,
          "epa_rush": 4.3,
          "epa_total": 11.5,
          "game_id": "ncaa_2024_w10_uga_ole",
          "id": "stat_ole_w10",
          "is_home": true,
          "passing_yards": 261,
          "red_zone_att": 4,
          "red_zone_comp": 3,
          "rushing_yards": 134,
          "team_id": "ncaa_MISS",
          "third_down_att": 14,
          "third_down_comp": 7,
          "time_of_possession": "32:28",
          "total_yards": 395,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "P.Umanmielen captura a Carson Beck por el lado ciego y provoca balón suelto recuperado por Ole Miss en zona roja.",
          "down": 3,
          "epa": -4.5,
          "game_id": "ncaa_2024_w10_uga_ole",
          "highlight_timestamp": "06:14 Q3",
          "id": "play_w10_uga_ole_01",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_princely_strip_sack",
          "play_type": "pass",
          "possession_team_id": "ncaa_UGA",
          "quarter": 3,
          "time_remaining": "06:14",
          "wp_after": 0.66,
          "wp_before": 0.38,
          "wp_swing": 0.28,
          "yardline": "UGA 31",
          "ydstogo": 8
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "2.0 sacks, 1 forced fumble, 7 hurries, destroying Georgia's right tackle.",
                "label": "Speed Rush Masterclass"
              }
            ],
            "player": "Princely Umanmielen",
            "role": "Defensive MVP",
            "team_code": "MISS"
          },
          {
            "bullets": [
              {
                "detail": "Overcame an early ankle injury to pass for 199 yards and rush for 50 yards and a score.",
                "label": "Toughness & Control"
              }
            ],
            "player": "Jaxson Dart",
            "role": "The Engine (Game MVP)",
            "team_code": "MISS"
          }
        ],
        "game_id": "ncaa_2024_w10_uga_ole",
        "headline": "Oxford Earthquake: Princely Umanmielen & Ole Miss Pass Rush Obliterate Georgia 28-10",
        "historic_facts": [
          {
            "description": "Ended Georgia's 52-game winning streak against non-Alabama opponents.",
            "title": "Kirby Smart Streak Broken"
          },
          {
            "description": "Ole Miss logged 5 sacks and 9 tackles for loss against an SEC-leading offensive line.",
            "title": "Sack Festival"
          },
          {
            "description": "Fans tore down both goalposts and carried them down University Avenue to The Square.",
            "title": "Field Storming Tradition"
          }
        ],
        "id": "analysis_ncaa_2024_w10_uga_ole",
        "narrative_summary": "In the defining upset of the 2024 college football season, Pete Golding's Ole Miss defense unleashed an unremitting pass-rushing blitzkrieg against Carson Beck, sacking Georgia's quarterback 5 times and hitting him on 14 dropbacks in a 28-10 demolition in Oxford. Lane Kiffin's offense controlled tempo with Jaxson Dart while the Rebels held the Bulldogs to an abysmal 59 rushing yards.",
        "tactical_dos_donts": [
          {
            "logic": "Exploited slow-footwork college tackles on standard pass sets with pure speed rushes.",
            "strategy": "Align Edge Rushers in Wide-9 Stances",
            "type": "DO"
          },
          {
            "logic": "Carson Beck was picked off twice trying to force boundary out-routes.",
            "strategy": "Force Boundary Passes into Cloud Coverage",
            "type": "DONT"
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
          "epa_pass": 3.4,
          "epa_rush": 18.2,
          "epa_total": 21.6,
          "game_id": "ncaa_2024_w10_ala_lsu",
          "id": "stat_ala_w10",
          "is_home": false,
          "passing_yards": 109,
          "red_zone_att": 5,
          "red_zone_comp": 5,
          "rushing_yards": 311,
          "team_id": "ncaa_ALA",
          "third_down_att": 14,
          "third_down_comp": 10,
          "time_of_possession": "34:10",
          "total_yards": 420,
          "turnovers": 0
        },
        {
          "epa_pass": -4.1,
          "epa_rush": -5.7,
          "epa_total": -9.8,
          "game_id": "ncaa_2024_w10_ala_lsu",
          "id": "stat_lsu_w10",
          "is_home": true,
          "passing_yards": 237,
          "red_zone_att": 4,
          "red_zone_comp": 1,
          "rushing_yards": 104,
          "team_id": "ncaa_LSU",
          "third_down_att": 14,
          "third_down_comp": 6,
          "time_of_possession": "25:50",
          "total_yards": 341,
          "turnovers": 3
        }
      ],
      "key_plays": [
        {
          "description": "J.Milroe escapa por el centro en jugada rota y acelera 72 yardas para su cuarto TOUCHDOWN terrestre de la noche en Death Valley.",
          "down": 2,
          "epa": 5.4,
          "game_id": "ncaa_2024_w10_ala_lsu",
          "highlight_timestamp": "04:20 Q3",
          "id": "play_w10_ala_lsu_01",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_milroe_72yd_run",
          "play_type": "rush",
          "possession_team_id": "ncaa_ALA",
          "quarter": 3,
          "time_remaining": "04:20",
          "wp_after": 1.0,
          "wp_before": 0.68,
          "wp_swing": 0.32,
          "yardline": "ALA 28",
          "ydstogo": 6
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "12 tackles, 1.5 sacks, 1 forced fumble, shutting down LSU's rushing game.",
                "label": "Physical Dominance"
              }
            ],
            "player": "Jihaad Campbell",
            "role": "Defensive MVP",
            "team_code": "ALA"
          },
          {
            "bullets": [
              {
                "detail": "185 rushing yards, 4 touchdowns on runs of 39, 10, 19, and 72 yards.",
                "label": "Historic Rush Clinic"
              }
            ],
            "player": "Jalen Milroe",
            "role": "The Engine (Game MVP)",
            "team_code": "ALA"
          }
        ],
        "game_id": "ncaa_2024_w10_ala_lsu",
        "headline": "Death Valley Dismantling: Jalen Milroe Rushes for 4 Touchdowns as Alabama Crushes LSU 42-13",
        "historic_facts": [
          {
            "description": "Milroe became the first quarterback in SEC history to rush for 4 touchdowns in Tiger Stadium.",
            "title": "4-TD Milestone"
          },
          {
            "description": "Alabama gashed LSU for 311 yards on the ground at 6.8 yards per carry.",
            "title": "311 Rushing Yards"
          },
          {
            "description": "LSU scored on only 1 of 4 trips inside Alabama's 20-yard line.",
            "title": "Nussmeier Red Zone Woes"
          }
        ],
        "id": "analysis_ncaa_2024_w10_ala_lsu",
        "narrative_summary": "Under a torrential downpour in Baton Rouge, Jalen Milroe put on an all-time dual-threat masterclass, gashing LSU's defense for 185 rushing yards and 4 touchdowns on just 12 carries (15.4 yards per carry) in a 42-13 rout. Kane Wommack's defense tormented Garrett Nussmeier with 3 turnovers and two fourth-down stops, eliminating Brian Kelly's Tigers from the SEC Championship race.",
        "tactical_dos_donts": [
          {
            "logic": "Gashed linebackers flowing horizontally to outside zone, creating massive cutback lanes for Milroe.",
            "strategy": "Utilize Heavy Pulling Guards on QB Counter",
            "type": "DO"
          },
          {
            "logic": "Leaving the middle of the field vacant enabled Milroe's 72-yard touchdown dash.",
            "strategy": "Blitz Slot Cornerbacks Without Safety Rotation",
            "type": "DONT"
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
          "epa_pass": -6.2,
          "epa_rush": -4.2,
          "epa_total": -10.4,
          "game_id": "nfl_2024_w9_den_bal",
          "id": "stat_den_w9",
          "is_home": false,
          "passing_yards": 197,
          "red_zone_att": 2,
          "red_zone_comp": 1,
          "rushing_yards": 122,
          "team_id": "nfl_DEN",
          "third_down_att": 14,
          "third_down_comp": 6,
          "time_of_possession": "27:54",
          "total_yards": 319,
          "turnovers": 1
        },
        {
          "epa_pass": 21.2,
          "epa_rush": 7.3,
          "epa_total": 28.5,
          "game_id": "nfl_2024_w9_den_bal",
          "id": "stat_bal_w9",
          "is_home": true,
          "passing_yards": 269,
          "red_zone_att": 5,
          "red_zone_comp": 5,
          "rushing_yards": 127,
          "team_id": "nfl_BAL",
          "third_down_att": 8,
          "third_down_comp": 5,
          "time_of_possession": "32:06",
          "total_yards": 396,
          "turnovers": 0
        }
      ],
      "key_plays": [
        {
          "description": "L.Jackson elude la presión y conecta pase de 7 yardas con Z.Flowers para touchdown, rumbo a una actuación perfecta con 158.3 de rating.",
          "down": 2,
          "epa": 3.1,
          "game_id": "nfl_2024_w9_den_bal",
          "highlight_timestamp": "00:32 Q2",
          "id": "play_w9_den_bal_01",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_lamar_flowers_td",
          "play_type": "pass",
          "possession_team_id": "nfl_BAL",
          "quarter": 2,
          "time_remaining": "00:32",
          "wp_after": 0.92,
          "wp_before": 0.74,
          "wp_swing": 0.18,
          "yardline": "DEN 7",
          "ydstogo": 7
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "10 tackles, 1 TFL, 1 sack, neutralizing Bo Nix's checkdown reads.",
                "label": "All-Around Disruption"
              }
            ],
            "player": "Kyle Hamilton",
            "role": "Defensive MVP",
            "team_code": "BAL"
          },
          {
            "bullets": [
              {
                "detail": "16/19, 280 yards, 3 TDs, 0 INTs, 158.3 passer rating, +21.2 EPA.",
                "label": "Perfection"
              }
            ],
            "player": "Lamar Jackson",
            "role": "The Engine (Game MVP)",
            "team_code": "BAL"
          }
        ],
        "game_id": "nfl_2024_w9_den_bal",
        "headline": "Rating Perfection: Lamar Jackson & Derrick Henry Decimate Denver's #3 Defense 41-10",
        "historic_facts": [
          {
            "description": "Jackson joined Tom Brady and Peyton Manning as the only quarterbacks with 4 career games with a maximum 158.3 passer rating.",
            "title": "4th Perfect Game"
          },
          {
            "description": "Derrick Henry scored his 100th career rushing touchdown.",
            "title": "The Century Mark"
          },
          {
            "description": "Baltimore scored touchdowns on all 5 of their red zone possessions.",
            "title": "Red Zone Efficiency"
          }
        ],
        "id": "analysis_nfl_2024_w9_den_bal",
        "narrative_summary": "Lamar Jackson put on an absolute clinic against Vance Joseph's third-ranked Denver defense, completing 16 of 19 passes for 280 yards, 3 touchdowns, zero interceptions, and a flawless 158.3 passer rating in a 41-10 blowout at M&T Bank Stadium. Derrick Henry added 106 yards and 2 touchdowns, completely overwhelming Denver's front seven.",
        "tactical_dos_donts": [
          {
            "logic": "Denver committed safety support against Henry, allowing Flowers and Bateman wide-open intermediate crossing routes.",
            "strategy": "Run Play-Action Boots Against 8-Man Boxes",
            "type": "DO"
          },
          {
            "logic": "Denver cornerbacks were burned for 180 yards after the catch on crossing patterns.",
            "strategy": "Leave Cornerbacks on Islands Against Crossing Routes",
            "type": "DONT"
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
          "epa_pass": 2.4,
          "epa_rush": 4.4,
          "epa_total": 6.8,
          "game_id": "ncaa_2024_w9_osu_psu",
          "id": "stat_osu_w9",
          "is_home": false,
          "passing_yards": 182,
          "red_zone_att": 3,
          "red_zone_comp": 2,
          "rushing_yards": 176,
          "team_id": "ncaa_OSU",
          "third_down_att": 12,
          "third_down_comp": 6,
          "time_of_possession": "31:48",
          "total_yards": 358,
          "turnovers": 1
        },
        {
          "epa_pass": -2.1,
          "epa_rush": -2.4,
          "epa_total": -4.5,
          "game_id": "ncaa_2024_w9_osu_psu",
          "id": "stat_psu_w9",
          "is_home": true,
          "passing_yards": 150,
          "red_zone_att": 3,
          "red_zone_comp": 0,
          "rushing_yards": 120,
          "team_id": "ncaa_PSU",
          "third_down_att": 11,
          "third_down_comp": 3,
          "time_of_possession": "28:12",
          "total_yards": 270,
          "turnovers": 1
        }
      ],
      "key_plays": [
        {
          "description": "Defensa de Ohio State frena a Kaytron Allen en 4to down y gol en la yarda 1. Cuatro paradas consecutivas en goal-to-go ante 111,030 aficionados.",
          "down": 4,
          "epa": -6.4,
          "game_id": "ncaa_2024_w9_osu_psu",
          "highlight_timestamp": "05:13 Q4",
          "id": "play_w9_osu_psu_01",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_osu_goal_line_stand",
          "play_type": "rush",
          "possession_team_id": "ncaa_PSU",
          "quarter": 4,
          "time_remaining": "05:13",
          "wp_after": 0.92,
          "wp_before": 0.44,
          "wp_swing": 0.48,
          "yardline": "OSU 1",
          "ydstogo": 1
        }
      ],
      "trivia": [],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Igbinosun snatched an interception off the receiver's helmet in the endzone.",
                "label": "Endzone Interception"
              },
              {
                "detail": "Styles made the 3rd-and-goal tackle in the backfield.",
                "label": "Goal-Line Wall"
              }
            ],
            "player": "Davison Igbinosun & Sonny Styles",
            "role": "Defensive MVP",
            "team_code": "OSU"
          },
          {
            "bullets": [
              {
                "detail": "Combined for 145 rushing yards and continuous physical conversion on 3rd and 4th downs.",
                "label": "Physical Ground Game"
              }
            ],
            "player": "Quinshon Judkins & Will Howard",
            "role": "The Engine (Game MVP)",
            "team_code": "OSU"
          }
        ],
        "game_id": "ncaa_2024_w9_osu_psu",
        "headline": "The 4-Play Goal-Line Wall: Ohio State's Defense Smothers Penn State 20-13 at Beaver Stadium",
        "historic_facts": [
          {
            "description": "Penn State's only touchdown came on a first-quarter pick-six by Zion Tracy.",
            "title": "0 Offensive Touchdowns"
          },
          {
            "description": "Ryan Day extended his undefeated record against Penn State to 6-0.",
            "title": "Day vs Franklin"
          },
          {
            "description": "Pennsylvania native Will Howard sealed the win with two first-down runs on the final drive.",
            "title": "Howard's Redemption"
          }
        ],
        "id": "analysis_ncaa_2024_w9_osu_psu",
        "narrative_summary": "Before a hostile White Out-adjacent crowd of 111,030 at Beaver Stadium, Jim Knowles' Ohio State defense etched an all-time signature stand. Trailing 20-13 with 5:13 remaining, Penn State had 1st-and-goal at the Ohio State 3-yard line. Over four consecutive plays, the Buckeyes stuffed three Kaytron Allen rushes and forced an incomplete fourth-down pass to seal the game.",
        "tactical_dos_donts": [
          {
            "logic": "Stuffed Kaytron Allen on three consecutive goal-to-go attempts by blowing up the A-gap.",
            "strategy": "Pinch Interior Defensive Tackles on Goal-Line Stands",
            "type": "DO"
          },
          {
            "logic": "Penn State failed to utilize All-American tight end Tyler Warren on their decisive fourth-down play.",
            "strategy": "Throw Boundary Fades on 4th-and-Goal",
            "type": "DONT"
          }
        ]
      }
    },
    {
      "id": "nfl_2026_sb_sea_ne",
      "league": "nfl",
      "season": 2025,
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
          "epa_pass": -11.4,
          "epa_rush": -5.4,
          "epa_total": -16.8,
          "game_id": "nfl_2026_sb_sea_ne",
          "id": "stat_ne_sb",
          "is_home": false,
          "passing_yards": 142,
          "red_zone_att": 2,
          "red_zone_comp": 1,
          "rushing_yards": 76,
          "team_id": "nfl_NE",
          "third_down_att": 13,
          "third_down_comp": 2,
          "time_of_possession": "24:18",
          "total_yards": 218,
          "turnovers": 3
        },
        {
          "epa_pass": 9.8,
          "epa_rush": 9.7,
          "epa_total": 19.5,
          "game_id": "nfl_2026_sb_sea_ne",
          "id": "stat_sea_sb",
          "is_home": true,
          "passing_yards": 237,
          "red_zone_att": 4,
          "red_zone_comp": 3,
          "rushing_yards": 135,
          "team_id": "nfl_SEA",
          "third_down_att": 15,
          "third_down_comp": 8,
          "time_of_possession": "35:42",
          "total_yards": 372,
          "turnovers": 0
        }
      ],
      "key_plays": [
        {
          "description": "B.Mafe ejecuta spin-move interior sobre el tackle derecho para forzar strip-sack sobre Drake Maye, recuperado por Seattle en la yarda 14.",
          "down": 3,
          "epa": -4.8,
          "game_id": "nfl_2026_sb_sea_ne",
          "highlight_timestamp": "03:45 Q2",
          "id": "play_sb_sea_ne_01",
          "is_touchdown": 0,
          "is_turnover": 1,
          "play_id": "p_sea_mafe_strip_sack",
          "play_type": "pass",
          "possession_team_id": "nfl_NE",
          "quarter": 2,
          "time_remaining": "03:45",
          "wp_after": 0.9,
          "wp_before": 0.62,
          "wp_swing": 0.28,
          "yardline": "NE 24",
          "ydstogo": 9
        },
        {
          "description": "K.Walker III encuentra el hueco en zona exterior, rompe dos tackleadas y se escapa 34 yardas a las diagonales para ampliar la ventaja a 19-0.",
          "down": 1,
          "epa": 4.2,
          "game_id": "nfl_2026_sb_sea_ne",
          "highlight_timestamp": "07:15 Q3",
          "id": "play_sb_sea_ne_02",
          "is_touchdown": 1,
          "is_turnover": 0,
          "play_id": "p_sea_kwalker_34yd_td",
          "play_type": "rush",
          "possession_team_id": "nfl_SEA",
          "quarter": 3,
          "time_remaining": "07:15",
          "wp_after": 0.99,
          "wp_before": 0.77,
          "wp_swing": 0.22,
          "yardline": "NE 34",
          "ydstogo": 10
        }
      ],
      "trivia": [
        {
          "category": "record",
          "fact_text": "Los Seahawks son el primer campeón de Super Bowl en la historia de la NFL sin cometer una sola entrega de balón en todos los playoffs.",
          "game_id": "nfl_2026_sb_sea_ne",
          "id": "triv_sb_sea_01"
        }
      ],
      "tactical_analysis": {
        "award_deep_dives": [
          {
            "bullets": [
              {
                "detail": "Generated 6 sacks, 21 pressures, 2 forced fumbles, and an interception while holding NE to 218 total yards.",
                "label": "Statistical Impact"
              },
              {
                "detail": "Held New England to 2-of-13 on third down conversions.",
                "label": "Third Down Lockdown"
              }
            ],
            "player": "Mike Macdonald's 'Dark Side' Defense",
            "role": "Defensive MVP (Collective)",
            "team_code": "SEA"
          },
          {
            "bullets": [
              {
                "detail": "Mafe beat the right tackle with an inside spin move to strip the football, leading directly to a Seattle touchdown.",
                "label": "Strip-Sack Climax"
              }
            ],
            "player": "Boye Mafe & Derick Hall",
            "role": "Linebacker & Sack of the Game",
            "team_code": "SEA"
          },
          {
            "bullets": [
              {
                "detail": "Targeted 5 times, allowing only 1 catch for 4 yards with 2 pass breakups in man coverage.",
                "label": "Island Lockdown"
              }
            ],
            "player": "Devon Witherspoon",
            "role": "Defensive Back of the Game",
            "team_code": "SEA"
          },
          {
            "bullets": [
              {
                "detail": "135 rushing yards on 22 carries (6.1 YPC) with 2 touchdowns, chewing up clock throughout the second half.",
                "label": "Ground Domination"
              }
            ],
            "player": "Kenneth Walker III",
            "role": "The Engine (Official Game MVP)",
            "team_code": "SEA"
          }
        ],
        "game_id": "nfl_2026_sb_sea_ne",
        "headline": "Defensive Mastery and Tactical Supremacy: A Comprehensive Analysis of Super Bowl LX",
        "historic_facts": [
          {
            "description": "With New England trailing 9-0 at halftime, Super Bowl history held firm; teams that are held scoreless in the first half are now 0-15 all-time in the Super Bowl.",
            "title": "The Post-Half Curse"
          },
          {
            "description": "The Seahawks became the first Super Bowl champion in NFL history to complete an entire postseason run without committing a single turnover.",
            "title": "The Perfect Champion"
          },
          {
            "description": "New England was 0-for-2 in red zone opportunities during the competitive phases of the game, forced into 6 punts and 2 turnovers.",
            "title": "Red Zone Suffocation"
          },
          {
            "description": "Seattle generated a 48.6% pressure rate while rushing 5 or more defenders on only 14% of snaps.",
            "title": "Pressure Rate Without Blitzing"
          }
        ],
        "id": "analysis_nfl_2026_sb_sea_ne",
        "narrative_summary": "The narrative of Super Bowl LX, held on February 8, 2026, at Levi's Stadium, was defined by the relentless defensive architecture of the Seattle Seahawks. In a decisive 29-13 victory over the New England Patriots, Mike Macdonald’s 'Dark Side' defense delivered a historic performance, shutting out the Patriots for three full quarters and stifling an offense that had been prolific throughout the postseason.",
        "tactical_dos_donts": [
          {
            "logic": "Confused the young quarterback by showing blitz with 6 men at the line of scrimmage then dropping two into underneath flats.",
            "strategy": "Disguise Pre-Snap Cover-3 Match with Simulated Creepers",
            "type": "DO"
          },
          {
            "logic": "Allowed Kenneth Walker cutback lanes against an aggressive front, racking up 135 rushing yards.",
            "strategy": "Establish Outside Zone Stretch to Tire Opposing Linebackers",
            "type": "DO"
          },
          {
            "logic": "Patriots surrendered 4 sacks on 7 play-action attempts due to rapid edge penetration by Seattle.",
            "strategy": "Call Slow-Developing Play-Action in Obvious Pass Situations",
            "type": "DONT"
          },
          {
            "logic": "Resulted in 2 pass breakups and an incomplete 4th-down attempt.",
            "strategy": "Challenge Devon Witherspoon on Boundary Fades Without Leverage",
            "type": "DONT"
          }
        ]
      }
    }
  ],
  "awards": [
    {
      "candidate_name": "Patrick Mahomes (QB, KC)",
      "category": "MVP",
      "clip_url": "https://www.youtube.com/results?search_query=Patrick+Mahomes+Week+1+2026+Chiefs+Ravens",
      "id": "awd_2026_w1_nfl_mvp",
      "league": "nfl",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "291 yardas de pase, 1 TD, 64% 3rd down conversion y liderazgo clutch en serie final.",
      "team_id": "nfl_KC",
      "week": 1
    },
    {
      "candidate_name": "Saquon Barkley (RB, PHI)",
      "category": "OPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Saquon+Barkley+Week+1+3+touchdowns+Eagles",
      "id": "awd_2026_w1_nfl_opow",
      "league": "nfl",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "109 yardas terrestres, 23 yardas de recepción y 3 anotaciones totales en el debut histórico en Brasil.",
      "team_id": "nfl_PHI",
      "week": 1
    },
    {
      "candidate_name": "Chris Jones (DT, KC)",
      "category": "DPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Chris+Jones+sack+Ravens+Kickoff+2026",
      "id": "awd_2026_w1_nfl_dpow",
      "league": "nfl",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "6 presiones al QB, 1 sack, 1 fumble forzado y taponazo en la línea en el último minuto.",
      "team_id": "nfl_KC",
      "week": 1
    },
    {
      "candidate_name": "Jake Bates (K, DET)",
      "category": "SPECIAL_TEAMS",
      "clip_url": "https://www.youtube.com/results?search_query=Jake+Bates+field+goal+Lions+Rams",
      "id": "awd_2026_w1_nfl_st",
      "league": "nfl",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "Gol de campo clutch de 32 yardas con 17 segundos restantes para forzar el tiempo extra ante Rams.",
      "team_id": "nfl_DET",
      "week": 1
    },
    {
      "candidate_name": "Xavier Worthy & Andy Reid (KC)",
      "category": "DO",
      "clip_url": "https://www.youtube.com/results?search_query=Xavier+Worthy+jet+sweep+Chiefs+design",
      "id": "awd_2026_w1_nfl_do",
      "league": "nfl",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "DO: Utilizar jet sweep motion como distracción profunda para crear huecos masivos (+4.2 EPA).",
      "team_id": "nfl_KC",
      "week": 1
    },
    {
      "candidate_name": "Isaiah Likely & Baltimore Offense (BAL)",
      "category": "DONT",
      "clip_url": "https://www.youtube.com/results?search_query=Isaiah+Likely+toe+review+touchdown+reversal",
      "id": "awd_2026_w1_nfl_dont",
      "league": "nfl",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "DON'T: Olvidar la noción espacial de la línea de fondo; rozar la línea blanca anuló el TD de la victoria.",
      "team_id": "nfl_BAL",
      "week": 1
    },
    {
      "candidate_name": "Carson Beck (QB, UGA)",
      "category": "MVP",
      "clip_url": "https://www.youtube.com/results?search_query=Carson+Beck+highlights+vs+Clemson+2026",
      "id": "awd_2026_w1_ncaa_mvp",
      "league": "ncaa",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "278 yardas, 2 TDs, 0 INTs y un demoledor 28-3 en la segunda mitad para aplastar a Clemson.",
      "team_id": "ncaa_UGA",
      "week": 1
    },
    {
      "candidate_name": "Quinn Ewers (QB, TEX)",
      "category": "OPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Quinn+Ewers+highlights+vs+Michigan+Big+House",
      "id": "awd_2026_w1_ncaa_opow",
      "league": "ncaa",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "246 yardas, 3 TDs, 62.5% de éxito en 3ra oportunidad conquistando The Big House de Michigan.",
      "team_id": "ncaa_TEX",
      "week": 1
    },
    {
      "candidate_name": "Malaki Starks (S, UGA)",
      "category": "DPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Malaki+Starks+interception+Clemson+Georgia",
      "id": "awd_2026_w1_ncaa_dpow",
      "league": "ncaa",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "Intercepción acrobática de espaldas, cero pases permitidos en su zona y asfixia total al ataque de Clemson.",
      "team_id": "ncaa_UGA",
      "week": 1
    },
    {
      "candidate_name": "Mitch Jeter (K, ND)",
      "category": "SPECIAL_TEAMS",
      "clip_url": "https://www.youtube.com/results?search_query=Mitch+Jeter+field+goals+Notre+Dame+Texas+AM",
      "id": "awd_2026_w1_ncaa_st",
      "league": "ncaa",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "3 de 3 en goles de campo, incluyendo patadas de 46 y 42 yardas bajo el ensordecedor ruido de Kyle Field.",
      "team_id": "ncaa_ND",
      "week": 1
    },
    {
      "candidate_name": "Jeremiyah Love (RB, ND)",
      "category": "DO",
      "clip_url": "https://www.youtube.com/results?search_query=Jeremiyah+Love+21+yard+TD+Kyle+Field",
      "id": "awd_2026_w1_ncaa_do",
      "league": "ncaa",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "DO: Atacar el centro de la línea defensiva con acarreos norte-sur con menos de 2 minutos (+4.8 EPA).",
      "team_id": "ncaa_ND",
      "week": 1
    },
    {
      "candidate_name": "Cade Klubnik & Dabo Swinney (CLEM)",
      "category": "DONT",
      "clip_url": "https://www.youtube.com/results?search_query=Georgia+defense+stops+Clemson+Aflac",
      "id": "awd_2026_w1_ncaa_dont",
      "league": "ncaa",
      "metric_value": 0.0,
      "rank": 1,
      "season": 2026,
      "stat_summary": "DON'T: Lanzar en pase estático a la ranura sin lectura de safety contra la trampa match de Kirby Smart.",
      "team_id": "ncaa_CLEM",
      "week": 1
    },
    {
      "candidate_name": "Josh Allen (Buffalo Bills)",
      "category": "MVP",
      "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+Week+11+Chiefs+run",
      "id": "mock_award_mvp_w11_1",
      "league": "nfl",
      "metric_value": 21.4,
      "rank": 1,
      "season": 2024,
      "stat_summary": "262 yds pase, 55 yds carrera, 2 TD totales | +21.4 EPA",
      "team_id": "nfl_BUF",
      "week": 11
    },
    {
      "candidate_name": "Josh Allen (Buffalo Bills)",
      "category": "OPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+Week+11+Chiefs+run",
      "id": "mock_award_opow_w11_1",
      "league": "nfl",
      "metric_value": 21.4,
      "rank": 1,
      "season": 2024,
      "stat_summary": "262 yds pase, 55 yds carrera, 2 TD totales | +21.4 EPA",
      "team_id": "nfl_BUF",
      "week": 11
    },
    {
      "candidate_name": "Amon-Ra St. Brown (Detroit Lions)",
      "category": "OPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Amon-Ra+St+Brown+Week+11",
      "id": "mock_award_opow_w11_2",
      "league": "nfl",
      "metric_value": 16.1,
      "rank": 2,
      "season": 2024,
      "stat_summary": "11 recepciones, 161 yardas, 2 Touchdowns",
      "team_id": "nfl_DET",
      "week": 11
    },
    {
      "candidate_name": "T.J. Watt (Pittsburgh Steelers)",
      "category": "DPOW",
      "clip_url": "https://www.youtube.com/results?search_query=TJ+Watt+vs+Ravens+Week+11",
      "id": "mock_award_dpow_w11_1",
      "league": "nfl",
      "metric_value": 2.5,
      "rank": 1,
      "season": 2024,
      "stat_summary": "2.5 Sacks, 1 Intercepción, 8 Tackleadas vs Ofensiva #1 de Ravens",
      "team_id": "nfl_PIT",
      "week": 11
    },
    {
      "candidate_name": "Karl Brooks (Green Bay Packers)",
      "category": "SPECIAL_TEAMS",
      "clip_url": "https://www.youtube.com/results?search_query=Karl+Brooks+blocked+field+goal",
      "id": "mock_award_st_w11_1",
      "league": "nfl",
      "metric_value": 76.0,
      "rank": 1,
      "season": 2024,
      "stat_summary": "Bloqueó gol de campo de 46 yds con 0:03 restantes (WP Swing: +76.0%)",
      "team_id": "nfl_GB",
      "week": 11
    },
    {
      "candidate_name": "Acarreo de 26 yardas de Josh Allen en 4ta y 2",
      "category": "DO",
      "clip_url": "https://www.youtube.com/results?search_query=Josh+Allen+touchdown+run+vs+Chiefs",
      "id": "mock_award_do_w11_1",
      "league": "nfl",
      "metric_value": 4.65,
      "rank": 1,
      "season": 2024,
      "stat_summary": "Jugada Maestra (+4.65 EPA) rompiendo dos tackleadas para sentenciar a KC",
      "team_id": "nfl_BUF",
      "week": 11
    },
    {
      "candidate_name": "Pase interceptado a Patrick Mahomes con 1:07 restante",
      "category": "DONT",
      "clip_url": "https://www.youtube.com/results?search_query=Patrick+Mahomes+interception+vs+Bills",
      "id": "mock_award_dont_w11_1",
      "league": "nfl",
      "metric_value": -4.85,
      "rank": 1,
      "season": 2024,
      "stat_summary": "Error Garrafal (-4.85 EPA) forzando envío bajo presión en 4ta y 13",
      "team_id": "nfl_KC",
      "week": 11
    },
    {
      "candidate_name": "Ryan Williams (Alabama Crimson Tide)",
      "category": "OPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Ryan+Williams+75+yard+touchdown",
      "id": "mock_award_ncaa_w11_1",
      "league": "ncaa",
      "metric_value": 17.7,
      "rank": 1,
      "season": 2024,
      "stat_summary": "6 recepciones, 177 yardas, acrobático TD de 75 yardas con doble giro",
      "team_id": "ncaa_ALA",
      "week": 11
    },
    {
      "candidate_name": "Zabien Brown (Alabama Crimson Tide)",
      "category": "DPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Zabien+Brown+interception+Georgia",
      "id": "mock_award_ncaa_w11_2",
      "league": "ncaa",
      "metric_value": 5.0,
      "rank": 1,
      "season": 2024,
      "stat_summary": "Intercepción en zona de anotación con 0:43 restantes para sellar el triunfo vs Georgia",
      "team_id": "ncaa_ALA",
      "week": 11
    },
    {
      "candidate_name": "Kenneth Walker III (Seattle Seahawks)",
      "category": "MVP",
      "clip_url": "https://www.youtube.com/results?search_query=Kenneth+Walker+Super+Bowl+LX",
      "id": "mock_award_sb_1",
      "league": "nfl",
      "metric_value": 19.5,
      "rank": 1,
      "season": 2025,
      "stat_summary": "135 yardas terrestres, 2 Touchdowns (6.1 YPC) | MVP de Super Bowl LX",
      "team_id": "nfl_SEA",
      "week": 22
    },
    {
      "candidate_name": "Defensa 'Dark Side' de Mike Macdonald (Seattle Seahawks)",
      "category": "DPOW",
      "clip_url": "https://www.youtube.com/results?search_query=Mike+Macdonald+Dark+Side+defense",
      "id": "mock_award_sb_2",
      "league": "nfl",
      "metric_value": 6.0,
      "rank": 1,
      "season": 2025,
      "stat_summary": "6 sacks, 21 presiones, blanqueada durante 3 cuartos completos (19-0)",
      "team_id": "nfl_SEA",
      "week": 22
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

// Dynamic Week Selector based on Selected Season
function populateWeekSelector(season) {
  const weekSelect = document.getElementById("select-week");
  if (!weekSelect) return;
  const s = parseInt(season, 10);
  if (s === 2026) {
    weekSelect.innerHTML = `
      <option value="1" selected>Semana 1 (Kickoff Septiembre 2026)</option>
    `;
    state.week = 1;
  } else if (s === 2025) {
    weekSelect.innerHTML = `
      <option value="22" selected>Super Bowl LX (Febrero 2026)</option>
    `;
    state.week = 22;
  } else {
    weekSelect.innerHTML = `
      <option value="11" ${state.week === 11 ? 'selected' : ''}>Semana 11</option>
      <option value="10" ${state.week === 10 ? 'selected' : ''}>Semana 10</option>
      <option value="9" ${state.week === 9 ? 'selected' : ''}>Semana 9</option>
    `;
    if (![11, 10, 9].includes(state.week)) {
      state.week = 11;
      weekSelect.value = "11";
    }
  }
}

// Season Switcher (Temporada 2026-2027 Actual, 2025-2026, 2024-2025)
async function changeSeason(seasonVal) {
  state.season = parseInt(seasonVal, 10);
  populateWeekSelector(state.season);
  const weekSelect = document.getElementById("select-week");
  if (weekSelect) {
    state.week = parseInt(weekSelect.value, 10);
  }
  state.divisionFilter = "ALL";
  renderFilterPills();
  await loadCurrentData();
}

// Week Switcher
async function changeWeek(weekVal) {
  state.week = parseInt(weekVal, 10);
  state.divisionFilter = "ALL";
  renderFilterPills();
  await loadCurrentData();
}

async function initApp() {
  const seasonSelect = document.getElementById("select-season");
  if (seasonSelect) {
    seasonSelect.value = state.season.toString();
  }
  populateWeekSelector(state.season);
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

  populateWeekSelector(state.season);
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
