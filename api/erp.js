/* ==========================================================================
   G&L MOTORS E.A.S. — Vercel Serverless Cloud Sync API (/api/erp)
   Zero-dependency persistent cloud database bridge protected by ADMIN_PASSWORD
   Supports: Vercel KV / Upstash Redis (auto-detected), Firebase RTDB, JSONBin
   ========================================================================== */

const DB_KEY = "glmotors_erp_state_v1";

function findUpstashCredentials() {
  const candidates = [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["REDIS_REST_API_URL", "REDIS_REST_API_TOKEN"]
  ];
  for (const [urlKey, tokenKey] of candidates) {
    if (process.env[urlKey] && process.env[tokenKey]) {
      return { url: process.env[urlKey].replace(/\/+$/, ""), token: process.env[tokenKey], provider: "upstash-redis" };
    }
  }
  // Auto-detect any custom prefix created by Vercel Marketplace (e.g., GLMOTORS_KV_REST_API_URL)
  for (const key of Object.keys(process.env)) {
    if (key.endsWith("_REST_API_URL") || key.endsWith("_REDIS_REST_URL")) {
      const prefix = key.replace(/_(REST_API_URL|REDIS_REST_URL)$/, "");
      const token =
        process.env[`${prefix}_REST_API_TOKEN`] ||
        process.env[`${prefix}_REDIS_REST_TOKEN`];
      if (process.env[key] && token) {
        return { url: process.env[key].replace(/\/+$/, ""), token, provider: "upstash-redis" };
      }
    }
  }
  return null;
}

function findFirebaseCredentials() {
  const url = process.env.FIREBASE_DB_URL;
  if (!url) return null;
  const auth = process.env.FIREBASE_DB_AUTH || "";
  const cleanUrl = url.replace(/\/+$/, "");
  const suffix = auth ? `?auth=${encodeURIComponent(auth)}` : "";
  return {
    endpoint: `${cleanUrl}/${DB_KEY}.json${suffix}`,
    provider: "firebase-rtdb"
  };
}

function findJsonBinCredentials() {
  const binId = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;
  if (!binId || !apiKey) return null;
  return {
    endpoint: `https://api.jsonbin.io/v3/b/${binId}`,
    apiKey,
    provider: "jsonbin"
  };
}

module.exports = async function handler(req, res) {
  // Prevent any CDN / browser caching of live ERP data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Server-side password verification
  const expectedPassword = process.env.ADMIN_PASSWORD || "BigLuck";
  const providedPassword = req.headers["x-admin-pass"] || "";
  if (providedPassword !== expectedPassword) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }

  const upstash = findUpstashCredentials();
  const firebase = findFirebaseCredentials();
  const jsonbin = findJsonBinCredentials();

  if (!upstash && !firebase && !jsonbin) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: "CLOUD_DB_NOT_CONNECTED",
      message: "Connect Upstash Redis in Vercel Dashboard -> Storage to enable multi-device cloud sync."
    });
  }

  try {
    // ----------------------------------------------------------------------
    // GET: Read latest ERP state from Cloud DB
    // ----------------------------------------------------------------------
    if (req.method === "GET") {
      if (upstash) {
        const r = await fetch(upstash.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${upstash.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(["GET", DB_KEY])
        });
        if (!r.ok) {
          return res.status(502).json({ ok: false, error: "UPSTASH_READ_ERROR", status: r.status });
        }
        const payload = await r.json();
        const raw = payload?.result;
        const data = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
        return res.status(200).json({ ok: true, configured: true, provider: upstash.provider, data });
      }

      if (firebase) {
        const r = await fetch(firebase.endpoint);
        if (!r.ok) {
          return res.status(502).json({ ok: false, error: "FIREBASE_READ_ERROR", status: r.status });
        }
        const data = await r.json();
        return res.status(200).json({ ok: true, configured: true, provider: firebase.provider, data });
      }

      if (jsonbin) {
        const r = await fetch(`${jsonbin.endpoint}/latest`, {
          headers: { "X-Master-Key": jsonbin.apiKey }
        });
        if (!r.ok) {
          return res.status(502).json({ ok: false, error: "JSONBIN_READ_ERROR", status: r.status });
        }
        const payload = await r.json();
        return res.status(200).json({ ok: true, configured: true, provider: jsonbin.provider, data: payload?.record || null });
      }
    }

    // ----------------------------------------------------------------------
    // PUT / POST: Save updated ERP state to Cloud DB
    // ----------------------------------------------------------------------
    if (req.method === "PUT" || req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const state = body?.data || body;

      if (!state || !Array.isArray(state.bikes)) {
        return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });
      }

      if (upstash) {
        const r = await fetch(upstash.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${upstash.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(["SET", DB_KEY, JSON.stringify(state)])
        });
        if (!r.ok) {
          const detail = await r.text();
          return res.status(502).json({ ok: false, error: "UPSTASH_WRITE_ERROR", detail });
        }
        return res.status(200).json({ ok: true, configured: true, provider: upstash.provider, updatedAt: state.updatedAt });
      }

      if (firebase) {
        const r = await fetch(firebase.endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state)
        });
        if (!r.ok) {
          return res.status(502).json({ ok: false, error: "FIREBASE_WRITE_ERROR", status: r.status });
        }
        return res.status(200).json({ ok: true, configured: true, provider: firebase.provider, updatedAt: state.updatedAt });
      }

      if (jsonbin) {
        const r = await fetch(jsonbin.endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": jsonbin.apiKey
          },
          body: JSON.stringify(state)
        });
        if (!r.ok) {
          return res.status(502).json({ ok: false, error: "JSONBIN_WRITE_ERROR", status: r.status });
        }
        return res.status(200).json({ ok: true, configured: true, provider: jsonbin.provider, updatedAt: state.updatedAt });
      }
    }

    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", detail: err.message });
  }
};
