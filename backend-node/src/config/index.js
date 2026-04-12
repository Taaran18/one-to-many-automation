/**
 * Centralised application configuration.
 *
 * Every environment variable is read here and only here.
 * The rest of the codebase imports from this module — never from process.env directly.
 * This makes configuration easy to audit, mock in tests, and extend.
 */

'use strict';

const config = {
  // ── Server ────────────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  get isDev() { return this.nodeEnv === 'development'; },

  // ── Database ──────────────────────────────────────────────────────────────
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  // ── Authentication & Encryption ───────────────────────────────────────────
  auth: {
    /** JWT signing secret — MUST match the value used in backend-python. */
    secretKey: process.env.SECRET_KEY || 'change-this-in-production',
    /** Fernet symmetric key — MUST match the value used in backend-python. */
    encryptionKey: process.env.ENCRYPTION_KEY,
    /** JWT TTL in seconds (480 min = 8 hours). */
    tokenExpirySeconds: 480 * 60,
  },

  // ── Application URLs ──────────────────────────────────────────────────────
  app: {
    /** Self-referential URL used to build uploaded image links. */
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
    /** Comma-separated list of allowed CORS origins. */
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean),
  },

  // ── External Services ─────────────────────────────────────────────────────
  services: {
    /** Meta (Facebook) Graph API base URL — version pinned here. */
    metaApiBase: 'https://graph.facebook.com/v19.0',
    // WhatsApp bridge and Email bridge are now in-process modules.
    // No bridge URLs needed.
  },

  // ── Scheduler ─────────────────────────────────────────────────────────────
  scheduler: {
    /** How often the campaign scheduler checks for due campaigns (seconds). */
    checkIntervalSeconds: 60,
    /** Delay between sending messages in a campaign run (milliseconds). */
    messageSendDelayMs: 2000,
    /** HTTP timeout for external API calls during campaign execution (ms). */
    apiTimeoutMs: 30_000,
  },

  // ── File Upload ───────────────────────────────────────────────────────────
  upload: {
    /** Allowed image extensions. */
    allowedExtensions: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']),
    /** Max upload size (10 MB). */
    maxFileSizeBytes: 10 * 1024 * 1024,
  },
};

module.exports = config;
