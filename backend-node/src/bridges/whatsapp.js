'use strict';

/**
 * WhatsApp Bridge — Baileys implementation.
 *
 * Uses @whiskeysockets/baileys which communicates with WhatsApp via
 * WebSocket directly — no Chrome / Puppeteer required.
 * Works on shared hosting.
 */

const qrcode = require('qrcode');
const path   = require('path');
const fs     = require('fs');

process.on('uncaughtException',  err => console.error('[wa-bridge] Uncaught exception:',  err.message));
process.on('unhandledRejection', r   => console.error('[wa-bridge] Unhandled rejection:', r));

// Sessions stored at backend-node/wa-sessions/<user_id>/
const SESSIONS_DIR = path.join(__dirname, '../../wa-sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// Silent logger — suppresses Baileys' very verbose pino output
const noopLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn:  () => {}, error: () => {}, fatal: () => {},
  child: () => noopLogger,
};

// Map of user_id (string) → { status, qrBase64, sock, info }
const sessions = new Map();

// Lazy-load Baileys (ESM package — must use dynamic import)
let _baileys = null;
async function getBaileys() {
  if (!_baileys) {
    _baileys = await import('@whiskeysockets/baileys');
  }
  return _baileys;
}

// ── Create / restore a session ────────────────────────────────────────────────

async function createSession(userId) {
  const id = String(userId);

  // Destroy previous instance if exists
  if (sessions.has(id)) {
    const old = sessions.get(id);
    try { old.sock?.end(undefined); } catch (_) {}
    sessions.delete(id);
  }

  const session = { status: 'qr_pending', qrBase64: null, sock: null, info: null };
  sessions.set(id, session);

  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
  } = await getBaileys();

  const authDir = path.join(SESSIONS_DIR, `user_${id}`);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let version = [2, 3000, 1015901307]; // fallback
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
  } catch (_) {}

  const sock = makeWASocket({
    version,
    auth: state,
    logger: noopLogger,
    printQRInTerminal: false,
    browser: ['OneToMany', 'Chrome', '1.0'],
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    syncFullHistory: false,
  });

  session.sock = sock;
  console.log(`[wa-bridge] [user ${id}] Initializing Baileys client...`);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // Ignore events from stale sockets (can fire after sock.end() during reconnect)
    if (sessions.get(id)?.sock !== sock) return;

    if (qr) {
      try {
        session.qrBase64 = await qrcode.toDataURL(qr);
        session.status   = 'qr_pending';
        console.log(`[wa-bridge] [user ${id}] QR generated`);
      } catch (e) {
        console.error(`[wa-bridge] [user ${id}] QR error:`, e.message);
      }
    }

    if (connection === 'open') {
      session.status   = 'connected';
      session.qrBase64 = null;
      try {
        const user     = sock.user;
        const rawPhone = (user?.id || '').split(':')[0].split('@')[0];
        session.info   = {
          name:         user?.name || 'Unknown',
          phone:        rawPhone ? '+' + rawPhone : null,
          connected_at: new Date().toISOString(),
        };
      } catch (_) {}
      console.log(`[wa-bridge] [user ${id}] Connected — ${session.info?.phone}`);
    }

    if (connection === 'close') {
      const code      = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[wa-bridge] [user ${id}] Connection closed (code ${code}, loggedOut: ${loggedOut})`);

      if (loggedOut) {
        session.status = 'disconnected';
        session.info   = null;
        sessions.delete(id);
      } else {
        // Auto-reconnect for transient disconnects (e.g. code 515 after first QR scan)
        console.log(`[wa-bridge] [user ${id}] Reconnecting in 3s...`);
        setTimeout(() => {
          // Only reconnect if this sock is still the active one
          if (sessions.get(id)?.sock === sock) {
            createSession(id).catch(e =>
              console.error(`[wa-bridge] [user ${id}] Reconnect error:`, e.message)
            );
          }
        }, 3000);
      }
    }
  });

  // Forward incoming messages to chats service
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid || '';
        if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '[media]';

        const fromPhone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

        // Lazy-require to avoid circular dependency
        const chatsService = require('../modules/chats/chats.service');
        await chatsService.handleIncoming({
          user_id:       parseInt(id),
          phone_no:      fromPhone,
          body,
          wa_message_id: msg.key.id || null,
        });

        console.log(`[wa-bridge] [user ${id}] Handled incoming from ${fromPhone}`);
      } catch (e) {
        console.error(`[wa-bridge] [user ${id}] message handler error:`, e.message);
      }
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

function getSession(userId) { return sessions.get(String(userId)); }

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
  if (s?.sock) {
    try { await s.sock.logout(); } catch (_) {}
    try { s.sock.end(undefined); } catch (_) {}
  }
  sessions.delete(id);

  // Remove persisted auth files so the session can't be restored
  const authDir = path.join(SESSIONS_DIR, `user_${id}`);
  try {
    if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
  } catch (_) {}
}

async function sendMessage(userId, phoneNo, message) {
  const s = getSession(userId);
  if (!s || s.status !== 'connected') throw new Error('WhatsApp not connected');

  // Normalise to Baileys JID format (digits only + @s.whatsapp.net)
  const digits = String(phoneNo).replace(/\D/g, '');
  const jid    = digits + '@s.whatsapp.net';

  const result = await s.sock.sendMessage(jid, { text: message });
  return result?.key?.id || null;
}

// ── Session restore on startup ────────────────────────────────────────────────

async function restoreExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log('[wa-bridge] No saved sessions — fresh start');
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(SESSIONS_DIR).filter(d => {
      if (!d.startsWith('user_')) return false;
      return fs.statSync(path.join(SESSIONS_DIR, d)).isDirectory();
    });
  } catch (e) {
    console.error('[wa-bridge] Could not read sessions dir:', e.message);
    return;
  }

  if (entries.length === 0) {
    console.log('[wa-bridge] No saved sessions — fresh start');
    return;
  }

  console.log(`[wa-bridge] Found ${entries.length} saved session(s) — restoring...`);
  for (const dir of entries) {
    const userId = dir.replace('user_', '');
    if (!userId) continue;
    console.log(`[wa-bridge] Restoring session for user ${userId}`);
    try { await createSession(userId); }
    catch (e) { console.error(`[wa-bridge] Failed to restore user ${userId}:`, e.message); }
  }
}

module.exports = { createSession, getStatus, getQR, getInfo, destroySession, sendMessage, restoreExistingSessions };
