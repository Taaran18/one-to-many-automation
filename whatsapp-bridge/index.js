const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Prevent Chrome crashes from killing the process
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

function findChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log("Using PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const cacheBase = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, ".cache", "puppeteer");
  const cacheDir = path.join(cacheBase, "chrome");
  console.log("Scanning for Chrome in:", cacheDir);
  try {
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir).filter((d) => d.startsWith("linux-")).sort().reverse();
      for (const v of versions) {
        const bin = path.join(cacheDir, v, "chrome-linux64", "chrome");
        if (fs.existsSync(bin)) {
          console.log("Found Chrome at:", bin);
          return bin;
        }
      }
    }
  } catch (e) {
    console.error("findChromePath error:", e.message);
  }
  console.warn("Chrome not found in cache, letting puppeteer decide");
  return undefined;
}

const CHROME_PATH = findChromePath();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.join(__dirname, "sessions");

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Map of user_id -> { client, status, qrBase64, info }
const sessions = new Map();

function getSession(userId) {
  return sessions.get(String(userId));
}

async function createSession(userId) {
  const id = String(userId);

  // Destroy existing session if present
  if (sessions.has(id)) {
    const old = sessions.get(id);
    try {
      await old.client.destroy();
    } catch (_) { }
    sessions.delete(id);
  }

  const session = { status: "qr_pending", qrBase64: null, client: null, info: null };
  sessions.set(id, session);

  const puppeteerOpts = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--disable-extensions",
      "--disable-accelerated-2d-canvas",
      "--disable-background-networking",
    ],
    timeout: 60000,
  };
  if (CHROME_PATH) puppeteerOpts.executablePath = CHROME_PATH;

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `user_${id}`,
      dataPath: SESSIONS_DIR,
    }),
    puppeteer: puppeteerOpts,
  });

  session.client = client;

  client.on("qr", async (qr) => {
    try {
      session.qrBase64 = await qrcode.toDataURL(qr);
      session.status = "qr_pending";
      console.log(`[user ${id}] QR generated`);
    } catch (err) {
      console.error(`[user ${id}] QR error:`, err);
    }
  });

  client.on("ready", () => {
    session.status = "connected";
    session.qrBase64 = null;
    try {
      const info = client.info;
      const rawPhone = info.wid._serialized.replace("@c.us", "").replace("@s.whatsapp.net", "");
      session.info = {
        name: info.pushname || "Unknown",
        phone: "+" + rawPhone,
        connected_at: new Date().toISOString(),
      };
    } catch (_) { }
    console.log(`[user ${id}] WhatsApp connected — ${session.info?.phone}`);
  });

  // Forward incoming messages to the backend webhook
  client.on("message", async (msg) => {
    try {
      // Only handle regular chats (not groups, status updates etc.)
      if (msg.isGroupMsg || msg.from === "status@broadcast") return;
      const fromPhone = msg.from.replace("@c.us", "").replace("@s.whatsapp.net", "");
      const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
      const payload = JSON.stringify({
        user_id: parseInt(id),
        phone_no: fromPhone,
        body: msg.body || "[media]",
        wa_message_id: msg.id ? msg.id._serialized : null,
      });
      const url = new URL(`${backendUrl}/chats/webhook/incoming`);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };
      const req = http.request(options);
      req.on("error", (e) => console.error(`[user ${id}] Webhook error:`, e.message));
      req.write(payload);
      req.end();
      console.log(`[user ${id}] Forwarded incoming msg from ${fromPhone}`);
    } catch (e) {
      console.error(`[user ${id}] message handler error:`, e.message);
    }
  });

  client.on("auth_failure", () => {
    session.status = "disconnected";
    session.info = null;
    console.log(`[user ${id}] Auth failure`);
  });

  client.on("disconnected", () => {
    session.status = "disconnected";
    session.info = null;
    console.log(`[user ${id}] Disconnected`);
  });

  client.initialize().catch((err) => {
    console.error(`[user ${id}] Initialize error:`, err.message);
    session.status = "disconnected";
  });
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

app.post("/session/create", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  await createSession(user_id);
  res.json({ status: "qr_pending" });
});

app.get("/session/status", (req, res) => {
  const { user_id } = req.query;
  const session = getSession(user_id);
  if (!session) return res.json({ status: "disconnected" });
  res.json({ status: session.status });
});

app.get("/session/qr", (req, res) => {
  const { user_id } = req.query;
  const session = getSession(user_id);
  if (!session) return res.status(404).json({ error: "No session" });
  // Return actual status so frontend knows if Chrome failed
  if (session.status === "disconnected") return res.json({ status: "disconnected", qr: null });
  if (session.status === "connected") return res.json({ status: "connected" });
  res.json({ status: "qr_pending", qr: session.qrBase64 || null });
});

app.get("/session/info", (req, res) => {
  const { user_id } = req.query;
  const session = getSession(user_id);
  if (!session || session.status !== "connected") {
    return res.status(404).json({ error: "Not connected" });
  }
  res.json(session.info || { name: null, phone: null, connected_at: null });
});

app.post("/session/destroy", async (req, res) => {
  const { user_id } = req.body;
  const session = getSession(user_id);
  if (session && session.client) {
    try {
      await session.client.logout();
      await session.client.destroy();
    } catch (_) { }
  }
  sessions.delete(String(user_id));
  res.json({ success: true });
});

app.post("/message/send", async (req, res) => {
  const { user_id, phone_no, message } = req.body;
  const session = getSession(user_id);
  if (!session || session.status !== "connected") {
    return res.status(400).json({ success: false, error: "Not connected" });
  }
  try {
    const msg = await session.client.sendMessage(phone_no, message);
    res.json({ success: true, message_id: msg.id._serialized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok", service: "WhatsApp Bridge", port: PORT }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Restore sessions on startup ────────────────────────────────────────────
// Scans SESSIONS_DIR for saved LocalAuth session directories and calls
// createSession() for each one so WhatsApp reconnects without a new QR scan.
// This runs before express starts listening so the sessions Map already has
// entries (status "qr_pending") by the time the first status poll arrives.

async function restoreExistingSessions() {
  const authDir = path.join(SESSIONS_DIR, "wwebjs_auth");
  if (!fs.existsSync(authDir)) {
    console.log("[startup] No saved sessions — fresh start");
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(authDir).filter((d) => d.startsWith("session-user_"));
  } catch (e) {
    console.error("[startup] Could not read auth dir:", e.message);
    return;
  }

  if (entries.length === 0) {
    console.log("[startup] No saved sessions — fresh start");
    return;
  }

  console.log(`[startup] Found ${entries.length} saved session(s) — restoring...`);
  for (const dir of entries) {
    const userId = dir.replace("session-user_", "");
    if (!userId) continue;
    console.log(`[startup] Restoring session for user ${userId}`);
    try {
      await createSession(userId);
    } catch (e) {
      console.error(`[startup] Failed to restore session for user ${userId}:`, e.message);
    }
  }
}

// Restore first, then open the port so status polls see "qr_pending" → "connected"
// rather than a brief "disconnected" window.
restoreExistingSessions()
  .catch((err) => console.error("[startup] Session restore error:", err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`WhatsApp bridge running on port ${PORT}`);
    });
  });
