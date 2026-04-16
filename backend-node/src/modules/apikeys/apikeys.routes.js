'use strict';

/**
 * API Key + Webhook token management (authenticated routes)
 *
 * GET    /api-keys                  — get current key & webhook token (creates if none)
 * POST   /api-keys/regenerate       — regenerate API key
 * DELETE /api-keys                  — revoke entire record (key + webhook)
 * POST   /api-keys/webhook/regenerate — regenerate webhook token only
 * DELETE /api-keys/webhook          — revoke webhook token only
 *
 * Public routes (no session):
 * POST   /v1/send                   — send via API key (X-API-Key header)
 * POST   /v1/webhook/:token         — send via webhook URL token
 */

const express = require('express');
const router  = express.Router();
const svc     = require('./apikeys.service');

// ── Authenticated routes ──────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const record = await svc.getOrCreate(req.user.id);
  res.json({
    key:               record.key,
    webhook_token:     record.webhook_token,
    created_at:        record.created_at,
    last_used:         record.last_used,
    webhook_last_used: record.webhook_last_used,
  });
});

router.post('/regenerate', async (req, res) => {
  const record = await svc.regenerate(req.user.id);
  res.json({
    key:               record.key,
    webhook_token:     record.webhook_token,
    created_at:        record.created_at,
    last_used:         null,
    webhook_last_used: record.webhook_last_used,
  });
});

router.delete('/', async (req, res) => {
  await svc.revoke(req.user.id);
  res.json({ success: true });
});

router.post('/webhook/regenerate', async (req, res) => {
  const record = await svc.regenerateWebhook(req.user.id);
  res.json({
    key:               record.key,
    webhook_token:     record.webhook_token,
    created_at:        record.created_at,
    last_used:         record.last_used,
    webhook_last_used: null,
  });
});

router.delete('/webhook', async (req, res) => {
  await svc.revokeWebhook(req.user.id);
  res.json({ success: true });
});

module.exports = router;
