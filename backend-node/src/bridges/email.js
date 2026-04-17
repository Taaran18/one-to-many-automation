'use strict';

/**
 * Email Bridge — embedded in-process module.
 *
 * Previously ran as a separate process on port 3002.
 * Now runs inside the backend process — no HTTP hops needed.
 *
 * Credentials are persisted to backend-node/email-sessions.json so sessions
 * survive restarts. The user stays logged in until they explicitly disconnect.
 */

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');
const config     = require('../config');

// email-sessions.json lives at backend-node/
const SESSIONS_FILE = path.join(__dirname, '../../email-sessions.json');

// ── Credential persistence ────────────────────────────────────────────────────

function loadCredentials() {
  try {
    if (fs.existsSync(SESSIONS_FILE))
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch (e) {
    console.error('[email-bridge] Could not read email-sessions.json:', e.message);
  }
  return {};
}

function saveCredentials(creds) {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(creds, null, 2), 'utf8'); }
  catch (e) { console.error('[email-bridge] Could not write email-sessions.json:', e.message); }
}

// ── In-memory sessions ────────────────────────────────────────────────────────

const sessions = new Map();

function getSession(userId) { return sessions.get(String(userId)); }

// ── SMTP presets ──────────────────────────────────────────────────────────────

const PRESETS = {
  gmail:   { host: 'smtp.gmail.com',        port: 587, secure: false },
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
  yahoo:   { host: 'smtp.mail.yahoo.com',   port: 587, secure: false },
  zoho:    { host: 'smtp.zoho.com',         port: 587, secure: false },
};

function resolveSmtp(provider, customHost, customPort) {
  if (provider && PRESETS[provider]) return PRESETS[provider];
  return { host: customHost || 'smtp.gmail.com', port: parseInt(customPort) || 587, secure: false };
}

async function buildSession(userId, { email, password, provider, smtp_host, smtp_port, display_name }) {
  const { host, port, secure } = resolveSmtp(provider, smtp_host, smtp_port);

  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized: false },
  });

  await transporter.verify();

  sessions.set(String(userId), {
    email,
    display_name: display_name || email,
    status:       'connected',
    transporter,
    smtp_host:    host,
    smtp_port:    port,
    provider:     provider || 'custom',
  });

  console.log(`[email-bridge] [user ${userId}] Connected: ${email} via ${host}:${port}`);
}

async function buildOAuth2Session(userId, { email, name, refreshToken, accessToken }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type:         'OAuth2',
      user:         email,
      clientId:     config.google.clientId,
      clientSecret: config.google.clientSecret,
      refreshToken,
      accessToken,
    },
  });

  await transporter.verify();

  sessions.set(String(userId), {
    email,
    display_name: name || email,
    status:       'connected',
    transporter,
    provider:     'gmail',
    authType:     'oauth2',
  });

  console.log(`[email-bridge] [user ${userId}] Connected via Gmail OAuth2: ${email}`);
}

// ── Public API (replaces the old HTTP endpoints) ──────────────────────────────

async function connect(userId, params) {
  await buildSession(userId, params);
  const creds = loadCredentials();
  creds[String(userId)] = { ...params, authType: 'smtp' };
  saveCredentials(creds);
  return { status: 'connected', email: params.email };
}

async function connectWithOAuth2(userId, params) {
  await buildOAuth2Session(userId, params);
  const creds = loadCredentials();
  creds[String(userId)] = { ...params, authType: 'oauth2' };
  saveCredentials(creds);
  return { status: 'connected', email: params.email };
}

function getStatus(userId) {
  const s = getSession(userId);
  return s
    ? { status: s.status, email: s.email, display_name: s.display_name }
    : { status: 'disconnected' };
}

function disconnect(userId) {
  const id = String(userId);
  if (sessions.has(id)) {
    try { sessions.get(id).transporter.close(); } catch {}
    sessions.delete(id);
    console.log(`[email-bridge] [user ${userId}] Disconnected`);
  }
  const creds = loadCredentials();
  delete creds[id];
  saveCredentials(creds);
}

async function sendMail(userId, { to, subject, html, text }) {
  const s = getSession(userId);
  if (!s || s.status !== 'connected') throw new Error('Email not connected');
  if (!to || !subject)               throw new Error('to and subject are required');

  const info = await s.transporter.sendMail({
    from: `"${s.display_name}" <${s.email}>`,
    to, subject,
    text: text || '',
    html: html || text || '',
  });

  console.log(`[email-bridge] [user ${userId}] Sent to ${to} — ${info.messageId}`);
  return { message_id: info.messageId };
}

// ── Session restore on startup ────────────────────────────────────────────────

async function restoreExistingSessions() {
  const creds   = loadCredentials();
  const userIds = Object.keys(creds);

  if (userIds.length === 0) {
    console.log('[email-bridge] No saved sessions — fresh start');
    return;
  }

  console.log(`[email-bridge] Restoring ${userIds.length} session(s)...`);
  for (const userId of userIds) {
    try {
      const cred = creds[userId];
      if (cred.authType === 'oauth2') {
        await buildOAuth2Session(userId, cred);
      } else {
        await buildSession(userId, cred);
      }
      console.log(`[email-bridge] Restored session for user ${userId}`);
    } catch (e) {
      console.error(`[email-bridge] Could not restore user ${userId}: ${e.message}`);
    }
  }
}

module.exports = { connect, connectWithOAuth2, getStatus, disconnect, sendMail, restoreExistingSessions };
