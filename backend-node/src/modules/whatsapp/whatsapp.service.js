'use strict';

const axios      = require('axios');
const prisma     = require('../../db/client');
const { encrypt, decrypt } = require('../../utils/encryption');
const { httpError }        = require('../../utils/errors');
const config               = require('../../config');
const waBridge             = require('../../bridges/whatsapp');

const { metaApiBase } = config.services;

// ── Session helper ────────────────────────────────────────────────────────────

async function getOrCreateSession(userId) {
  const existing = await prisma.whatsAppSession.findUnique({ where: { user_id: userId } });
  if (existing) return existing;
  return prisma.whatsAppSession.create({
    data: { user_id: userId, status: 'disconnected', wa_type: 'qr' },
  });
}

// ── Status ────────────────────────────────────────────────────────────────────

async function getStatus(user) {
  const session = await getOrCreateSession(user.id);

  if (session.wa_type === 'meta') {
    return { status: session.status, user_email: user.email || user.phone_no, wa_type: 'meta' };
  }

  const { status } = waBridge.getStatus(user.id);
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { status, last_seen: new Date() },
  });
  return { status, user_email: user.email || user.phone_no, wa_type: 'qr' };
}

// ── QR connect ────────────────────────────────────────────────────────────────

async function connectQR(user) {
  const session = await getOrCreateSession(user.id);

  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { wa_type: 'qr', meta_phone_id: null, meta_access_token: null },
  });

  await waBridge.createSession(user.id);
  await prisma.whatsAppSession.update({ where: { id: session.id }, data: { status: 'qr_pending' } });

  return { status: 'qr_pending', user_email: user.email || user.phone_no, wa_type: 'qr' };
}

// ── Meta connect ──────────────────────────────────────────────────────────────

async function connectMeta(user, { phone_id, access_token, waba_id }) {
  try {
    const resp = await axios.get(`${metaApiBase}/${phone_id}`, {
      params: { fields: 'display_phone_number,verified_name', access_token },
      timeout: 10_000,
    });
    if (resp.status !== 200)
      throw httpError(400, resp.data?.error?.message || 'Invalid Meta credentials.');
  } catch (err) {
    if (err.status) throw err;
    if (err.response) throw httpError(400, err.response.data?.error?.message || 'Invalid Meta credentials.');
    throw httpError(503, 'Could not reach Meta Graph API.');
  }

  const session = await getOrCreateSession(user.id);

  if (session.wa_type === 'qr') {
    await waBridge.destroySession(user.id);
  }

  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: {
      wa_type:           'meta',
      meta_phone_id:     phone_id,
      meta_access_token: encrypt(access_token),
      meta_waba_id:      waba_id.trim(),
      status:            'connected',
      last_seen:         new Date(),
    },
  });

  return { status: 'connected', user_email: user.email || user.phone_no, wa_type: 'meta' };
}

// ── QR code retrieval ─────────────────────────────────────────────────────────

async function getQR(userId) {
  const session = await getOrCreateSession(userId);

  // Auto-create session if bridge has none (e.g. after restart)
  const bridgeQR = waBridge.getQR(userId);

  if (bridgeQR.status === 'connected') {
    await prisma.whatsAppSession.update({ where: { id: session.id }, data: { status: 'connected' } });
    return { status: 'connected', qr: null };
  }

  if (bridgeQR.status === 'disconnected' && !waBridge.getSession?.(userId)) {
    // No session exists at all — create one so QR loads automatically
    await waBridge.createSession(userId);
    return { status: 'qr_pending', qr: null };
  }

  if (bridgeQR.status === 'disconnected') {
    await prisma.whatsAppSession.update({ where: { id: session.id }, data: { status: 'disconnected' } });
    return { status: 'disconnected', qr: null };
  }

  return { qr: bridgeQR.qr || null, status: 'qr_pending' };
}

// ── Connection info ───────────────────────────────────────────────────────────

async function getInfo(userId) {
  const session = await getOrCreateSession(userId);

  if (session.wa_type === 'meta' && session.meta_phone_id && session.meta_access_token) {
    try {
      const token = decrypt(session.meta_access_token);
      const resp  = await axios.get(`${metaApiBase}/${session.meta_phone_id}`, {
        params: { fields: 'display_phone_number,verified_name', access_token: token },
        timeout: 10_000,
      });
      if (resp.status === 200) {
        return {
          name: resp.data?.verified_name || null,
          phone: resp.data?.display_phone_number || null,
          connected_at: session.last_seen?.toISOString() || null,
          wa_type: 'meta',
        };
      }
    } catch { /* fall through */ }
    return { name: null, phone: null, connected_at: null, wa_type: 'meta' };
  }

  const info = waBridge.getInfo(userId);
  return info ? { ...info, wa_type: 'qr' } : { name: null, phone: null, connected_at: null, wa_type: 'qr' };
}

// ── Disconnect ────────────────────────────────────────────────────────────────

async function disconnect(userId) {
  const session = await getOrCreateSession(userId);

  if (session.wa_type === 'qr') {
    await waBridge.destroySession(userId);
  }

  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { status: 'disconnected', wa_type: 'qr', meta_phone_id: null, meta_access_token: null },
  });
}

module.exports = { getOrCreateSession, getStatus, connectQR, connectMeta, getQR, getInfo, disconnect };
