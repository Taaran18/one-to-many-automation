const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");
const os = require("os");

function findChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const cacheDir = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
  try {
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir).filter((d) => d.startsWith("linux-")).sort().reverse();
      for (const v of versions) {
        const bin = path.join(cacheDir, v, "chrome-linux64", "chrome");
        if (fs.existsSync(bin)) return bin;
      }
    }
  } catch (_) {}
  return undefined;
}

const app = express();
app.use(express.json());

const PORT = 3001;
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

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `user_${id}`,
      dataPath: SESSIONS_DIR,
    }),
    puppeteer: {
      executablePath: findChromePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--no-first-run",
        "--no-zygote",
      ],
      timeout: 60000,
    },
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
  if (session.status === "connected") return res.json({ status: "connected" });
  if (!session.qrBase64) return res.json({ status: "qr_pending", qr: null });
  res.json({ status: "qr_pending", qr: session.qrBase64 });
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

app.listen(PORT, () => {
  console.log(`WhatsApp bridge running on http://localhost:${PORT}`);
});
