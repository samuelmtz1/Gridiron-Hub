// api/v2/auth/login.js
// Vercel Serverless Function for Zero-Leak Authentication in Gridiron Hub 2.0
// Uses native Node.js crypto (PBKDF2-HMAC-SHA256, 100,000 rounds)
// Reads authorized users from Vercel Environment Variable: GRIDIRON_USERS_JSON

const crypto = require("crypto");

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Método no permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";

    if (!username || !password) {
      return res.status(400).json({ detail: "Nombre de usuario y contraseña requeridos." });
    }

    // Read environment variable configured in Vercel project settings
    const envUsersJson = process.env.GRIDIRON_USERS_JSON;
    if (!envUsersJson) {
      console.warn("GRIDIRON_USERS_JSON no configurada en variables de entorno de Vercel.");
      return res.status(401).json({ detail: "Credenciales no configuradas en el servidor." });
    }

    let usersList = [];
    try {
      usersList = JSON.parse(envUsersJson);
    } catch (e) {
      console.error("Error al parsear GRIDIRON_USERS_JSON:", e);
      return res.status(500).json({ detail: "Error de configuración de usuarios en el servidor." });
    }

    const user = Array.isArray(usersList)
      ? usersList.find(u => (u.username || "").trim().toLowerCase() === username)
      : null;

    if (!user || !user.password_hash || !user.password_hash.includes("$")) {
      // Dummy constant-time hashing to prevent username enumeration timing attacks
      crypto.pbkdf2Sync(password, "dummysaltdummy16b", 100000, 32, "sha256");
      return res.status(401).json({ detail: "Credenciales incorrectas." });
    }

    const [saltB64, expectedKeyB64] = user.password_hash.split("$");
    const salt = Buffer.from(saltB64, "base64");
    const expectedKey = Buffer.from(expectedKeyB64, "base64");
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

    if (derivedKey.length !== expectedKey.length || !crypto.timingSafeEqual(derivedKey, expectedKey)) {
      return res.status(401).json({ detail: "Credenciales incorrectas." });
    }

    // Cryptographic HMAC session token
    const signingSecret = process.env.TEAM_SHARED_SECRET || "gridiron_v2_vercel_session_secret_2026";
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: username,
      role: user.role || "editor",
      iat: now,
      exp: now + 7 * 86400,
      v: 2,
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", signingSecret).update(payloadB64).digest("base64url");
    const token = `${payloadB64}.${signature}`;

    return res.status(200).json({
      token,
      username,
      role: user.role || "editor",
      expires_in: 7 * 86400,
    });
  } catch (err) {
    console.error("Excepción en autenticación:", err);
    return res.status(500).json({ detail: "Error interno al verificar credenciales." });
  }
};
