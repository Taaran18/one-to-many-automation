'use strict';

const crypto   = require('crypto');
const prisma   = require('../../db/client');
const waBridge = require('../../bridges/whatsapp');

function generateKey() {
  return 'otm_' + crypto.randomBytes(28).toString('hex');
}

function generateWebhookToken() {
  return 'otm_wh_' + crypto.randomBytes(24).toString('hex');
}

async function getOrCreate(userId) {
  return prisma.apiKey.upsert({
    where:  { user_id: userId },
    update: {},
    create: { user_id: userId, key: generateKey() },
  });
}

async function get(userId) {
  return prisma.apiKey.findUnique({ where: { user_id: userId } });
}

async function regenerate(userId) {
  return prisma.apiKey.upsert({
    where:  { user_id: userId },
    update: { key: generateKey(), last_used: null },
    create: { user_id: userId, key: generateKey() },
  });
}

async function revoke(userId) {
  await prisma.apiKey.deleteMany({ where: { user_id: userId } });
}

// ── Webhook token management ──────────────────────────────────────────────────

async function regenerateWebhook(userId) {
  return prisma.apiKey.upsert({
    where:  { user_id: userId },
    update: { webhook_token: generateWebhookToken(), webhook_last_used: null },
    create: { user_id: userId, key: generateKey(), webhook_token: generateWebhookToken() },
  });
}

async function revokeWebhook(userId) {
  await prisma.apiKey.updateMany({
    where: { user_id: userId },
    data:  { webhook_token: null, webhook_last_used: null },
  });
}

// ── Public send (API key in header) ──────────────────────────────────────────

async function sendViaKey(rawKey, phone, message) {
  const record = await prisma.apiKey.findUnique({ where: { key: rawKey } });
  if (!record) throw Object.assign(new Error('Invalid API key'), { status: 401 });

  const userId = record.user_id;
  const { status } = waBridge.getStatus(userId);
  if (status !== 'connected') {
    throw Object.assign(new Error('WhatsApp is not connected for this account'), { status: 503 });
  }

  await waBridge.sendMessage(userId, phone, message);

  await prisma.apiKey.update({
    where: { id: record.id },
    data:  { last_used: new Date() },
  });
}

// ── Public send (webhook token in URL) ───────────────────────────────────────

async function sendViaWebhook(token, phone, message) {
  const record = await prisma.apiKey.findUnique({ where: { webhook_token: token } });
  if (!record) throw Object.assign(new Error('Invalid webhook token'), { status: 401 });

  const userId = record.user_id;
  const { status } = waBridge.getStatus(userId);
  if (status !== 'connected') {
    throw Object.assign(new Error('WhatsApp is not connected for this account'), { status: 503 });
  }

  await waBridge.sendMessage(userId, phone, message);

  await prisma.apiKey.update({
    where: { id: record.id },
    data:  { webhook_last_used: new Date() },
  });
}

module.exports = { getOrCreate, get, regenerate, revoke, regenerateWebhook, revokeWebhook, sendViaKey, sendViaWebhook };
