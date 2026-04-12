'use strict';

/**
 * WhatsApp Bridge — embedded in-process module.
 *
 * Previously ran as a separate process on port 3001.
 * Now runs inside the backend process — no HTTP hops needed.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path   = require('path');
const fs     = require('fs');

process.on('uncaughtException',  err => console.error('[wa-bridge] Uncaught exception:',  err.message));
process.on('unhandledRejection', r   => console.error('[wa-bridge] Unhandled rejection:', r));

// ── Chrome path resolution ────────────────────────────────────────────────────

function findChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log('[wa-bridge] Using PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  try {
    const puppeteer = require('puppeteer');
    const p = puppeteer.executablePath();
    if (p && fs.existsSync(p)) {
      console.log('[wa-bridge] Using puppeteer-managed Chrome:', p);
      return p;
    }
  } catch (e) {
    console.warn('[wa-bridge] puppeteer.executablePath() failed:', e.message);
  }

  const isWindows = process.platform === 'win32';
  // __dirname = backend-node/src/bridges → ../../ = backend-node/
  const cacheBase = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '../../.cache/puppeteer');
  const cacheDir  = path.join(cacheBase, 'chrome');
  console.log('[wa-bridge] Scanning for Chrome in:', cacheDir);

  try {
    if (fs.existsSync(cacheDir)) {
      const prefix   = isWindows ? 'win64-' : 'linux-';
      const versions = fs.readdirSync(cacheDir).filter(d => d.startsWith(prefix)).sort();
      for (const v of versions) {
        const bin = isWindows
          ? path.join(cacheDir, v, 'chrome-win64', 'chrome.exe')
          : path.join(cacheDir, v, 'chrome-linux64', 'chrome');
        if (fs.existsSync(bin)) {
          console.log('[wa-bridge] Found Chrome at:', bin);
          return bin;
        }
      }
    }
  } catch (e) {
    console.error('[wa-bridge] findChromePath scan error:', e.message);
  }

  console.warn('[wa-bridge] Chrome not found — run: cd backend-node && npx puppeteer browsers install chrome');
  return undefined;
}

const CHROME_PATH  = findChromePath();
// Sessions live at backend-node/wa-sessions/
const SESSIONS_DIR = path.join(__dirname, '../../wa-sessions');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// Map of user_id (string) → { status, qrBase64, client, info }
const sessions = new Map();

function getSession(userId) { return sessions.get(String(userId)); }

// ── Create / restore a session ────────────────────────────────────────────────

async function createSession(userId) {
  const id = String(userId);

  if (sessions.has(id)) {
    const old = sessions.get(id);
    try { await old.client.destroy(); } catch (_) {}
    sessions.delete(id);
  }

  const session = { status: 'qr_pending', qrBase64: null, client: null, info: null };
  sessions.set(id, session);

  const puppeteerOpts = {
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--no-first-run', '--no-zygote',
      '--disable-extensions', '--disable-accelerated-2d-canvas', '--disable-background-networking',
    ],
    timeout: 60000,
  };
  if (CHROME_PATH) puppeteerOpts.executablePath = CHROME_PATH;

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `user_${id}`, dataPath: SESSIONS_DIR }),
    puppeteer: puppeteerOpts,
  });

  session.client = client;
  console.log(`[wa-bridge] [user ${id}] Initializing client...`);

  client.on('qr', async qr => {
    try {
      session.qrBase64 = await qrcode.toDataURL(qr);
      session.status   = 'qr_pending';
      console.log(`[wa-bridge] [user ${id}] QR generated`);
    } catch (err) {
      console.error(`[wa-bridge] [user ${id}] QR generation error:`, err);
    }
  });

  client.on('loading_screen', (percent, msg) => {
    console.log(`[wa-bridge] [user ${id}] Loading: ${percent}% — ${msg}`);
  });

  client.on('ready', () => {
    session.status   = 'connected';
    session.qrBase64 = null;
    try {
      const info     = client.info;
      const rawPhone = info.wid._serialized
        .replace('@c.us', '')
        .replace('@s.whatsapp.net', '');
      session.info = {
        name: info.pushname || 'Unknown',
        phone: '+' + rawPhone,
        connected_at: new Date().toISOString(),
      };
    } catch (_) {}
    console.log(`[wa-bridge] [user ${id}] Connected — ${session.info?.phone}`);
  });

  // Forward incoming messages directly to the chats service (no HTTP)
  client.on('message', async msg => {
    try {
      if (msg.fromMe || msg.isGroupMsg || msg.from === 'status@broadcast') return;

      let fromPhone = msg.from
        .replace(/@c\.us$/, '')
        .replace(/@s\.whatsapp\.net$/, '')
        .replace(/@lid$/, '');

      if (msg.from.endsWith('@lid')) {
        try {
          const contact = await msg.getContact();
          if (contact?.number) fromPhone = contact.number;
        } catch (e) {
          console.warn(`[wa-bridge] [user ${id}] Could not resolve @lid:`, e.message);
        }
      }

      // Lazy-require to avoid circular dependency at module load time
      const chatsService = require('../modules/chats/chats.service');
      await chatsService.handleIncoming({
        user_id:       parseInt(id),
        phone_no:      fromPhone,
        body:          msg.body || '[media]',
        wa_message_id: msg.id?._serialized || null,
      });

      console.log(`[wa-bridge] [user ${id}] Handled incoming from ${fromPhone}`);
    } catch (e) {
      console.error(`[wa-bridge] [user ${id}] message handler error:`, e.message);
    }
  });

  client.on('auth_failure', () => {
    session.status = 'disconnected';
    session.info   = null;
    console.log(`[wa-bridge] [user ${id}] Auth failure`);
  });

  client.on('disconnected', () => {
    session.status = 'disconnected';
    session.info   = null;
    console.log(`[wa-bridge] [user ${id}] Disconnected`);
  });

  client.initialize().catch(err => {
    console.error(`[wa-bridge] [user ${id}] Initialize error:`, err.message);
    if (/executable|chrome/i.test(err.message)) {
      console.error(`[wa-bridge] Chrome not found. Run: cd backend-node && npx puppeteer browsers install chrome`);
    }
    session.status = 'disconnected';
  });
}

// ── Public API (replaces the old HTTP endpoints) ──────────────────────────────

function getStatus(userId) {
  const s = getSession(userId);
  return s ? { status: s.status } : { status: 'disconnected' };
}

function getQR(userId) {
  const s = getSession(userId);
  if (!s)                          return { status: 'disconnected', qr: null };
  if (s.status === 'connected')    return { status: 'connected',    qr: null };
  if (s.status === 'disconnected') return { status: 'disconnected', qr: null };
  return { status: 'qr_pending', qr: s.qrBase64 || null };
}

function getInfo(userId) {
  const s = getSession(userId);
  if (!s || s.status !== 'connected') return null;
  return s.info || { name: null, phone: null, connected_at: null };
}

async function destroySession(userId) {
  const id = String(userId);
  const s  = sessions.get(id);
  if (s?.client) {
    try { await s.client.logout();  } catch (_) {}
    try { await s.client.destroy(); } catch (_) {}
  }
  sessions.delete(id);
}

async function sendMessage(userId, phoneNo, message) {
  const s = getSession(userId);
  if (!s || s.status !== 'connected') throw new Error('WhatsApp not connected');
  const msg = await s.client.sendMessage(phoneNo, message);
  return msg.id._serialized;
}

// ── Session restore on startup ────────────────────────────────────────────────

async function restoreExistingSessions() {
  const authDir = path.join(SESSIONS_DIR, 'wwebjs_auth');
  if (!fs.existsSync(authDir)) {
    console.log('[wa-bridge] No saved sessions — fresh start');
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(authDir).filter(d => d.startsWith('session-user_'));
  } catch (e) {
    console.error('[wa-bridge] Could not read auth dir:', e.message);
    return;
  }

  if (entries.length === 0) {
    console.log('[wa-bridge] No saved sessions — fresh start');
    return;
  }

  console.log(`[wa-bridge] Found ${entries.length} saved session(s) — restoring...`);
  for (const dir of entries) {
    const userId = dir.replace('session-user_', '');
    if (!userId) continue;
    console.log(`[wa-bridge] Restoring session for user ${userId}`);
    try { await createSession(userId); }
    catch (e) { console.error(`[wa-bridge] Failed to restore user ${userId}:`, e.message); }
  }
}

module.exports = { createSession, getStatus, getQR, getInfo, destroySession, sendMessage, restoreExistingSessions };
