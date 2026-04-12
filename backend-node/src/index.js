'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app                = require('./app');
const { startScheduler } = require('./scheduler');
const config             = require('./config');
const waBridge           = require('./bridges/whatsapp');
const emailBridge        = require('./bridges/email');

// ── Start bridges then open the HTTP port ─────────────────────────────────────
// Bridges restore first so sessions are live before the first API request arrives.

async function start() {
  // Restore WhatsApp sessions (non-blocking — Chrome init is async)
  waBridge.restoreExistingSessions().catch(err =>
    console.error('[wa-bridge] Session restore error:', err.message)
  );

  // Restore Email sessions (fast — just SMTP verify)
  await emailBridge.restoreExistingSessions().catch(err =>
    console.error('[email-bridge] Session restore error:', err.message)
  );

  app.listen(config.port, () => {
    console.log(`[server] OneToMany Automation API running on http://localhost:${config.port}`);
    console.log(`[server] Environment: ${config.nodeEnv}`);
    console.log(`[server] WhatsApp bridge: in-process`);
    console.log(`[server] Email bridge:    in-process`);
    startScheduler();
  });
}

start().catch(err => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => { console.log('[server] SIGTERM — shutting down'); process.exit(0); });
process.on('SIGINT',  () => { console.log('[server] SIGINT — shutting down');  process.exit(0); });
