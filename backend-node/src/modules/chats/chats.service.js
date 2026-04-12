'use strict';

const axios      = require('axios');
const prisma     = require('../../db/client');
const { decrypt }   = require('../../utils/encryption');
const { httpError } = require('../../utils/errors');
const config        = require('../../config');

const { metaApiBase } = config.services;

function normalizePhone(phone) {
  return phone.replace(/^\+/, '').replace(/[\s-]/g, '');
}

// ── Webhook (called directly by wa-bridge, no HTTP) ───────────────────────────

async function handleIncoming({ user_id, phone_no, body, wa_message_id }) {
  const user = await prisma.user.findUnique({ where: { id: user_id } });
  if (!user) throw httpError(404, 'User not found');

  const normPhone = normalizePhone(phone_no);

  if (wa_message_id) {
    const existing = await prisma.incomingMessage.findFirst({ where: { wa_message_id } });
    if (existing) return { success: true, duplicate: true };
  }

  await prisma.incomingMessage.create({
    data: {
      user_id,
      phone_no: normPhone,
      body,
      wa_message_id: wa_message_id || null,
      is_read: false,
    },
  });

  return { success: true };
}

// ── Unread count ──────────────────────────────────────────────────────────────

async function getUnreadCount(userId) {
  const count = await prisma.incomingMessage.count({
    where: {
      user_id: userId,
      is_read: false,
      wa_message_id: { not: 'OUTBOUND_DIRECT' },
    },
  });
  return { unread_count: count };
}

// ── Contacts list ─────────────────────────────────────────────────────────────

async function getContacts(userId, { archived = false } = {}) {
  const outboundRows = await prisma.$queryRaw`
    SELECT l.phone_no, MAX(ml.sent_at) AS last_at
    FROM message_logs ml
    JOIN leads l ON ml.lead_id = l.id
    WHERE l.user_id = ${userId}
    GROUP BY l.phone_no
  `;

  const inboundRows = await prisma.$queryRaw`
    SELECT phone_no, MAX(received_at) AS last_at
    FROM incoming_messages
    WHERE user_id = ${userId}
    GROUP BY phone_no
  `;

  const phoneTime = {};
  for (const row of outboundRows) {
    const key = normalizePhone(row.phone_no);
    phoneTime[key] = row.last_at;
  }
  for (const row of inboundRows) {
    const key      = normalizePhone(row.phone_no);
    const existing = phoneTime[key];
    if (!existing || (row.last_at && row.last_at > existing)) {
      phoneTime[key] = row.last_at;
    }
  }

  if (Object.keys(phoneTime).length === 0) return [];

  const archivedSet = await getArchivedPhones(userId);

  const sortedPhones = Object.entries(phoneTime)
    .filter(([phone]) => archived ? archivedSet.has(phone) : !archivedSet.has(phone))
    .sort(([, a], [, b]) => new Date(b || 0) - new Date(a || 0));

  const contacts = [];
  for (const [normPhone] of sortedPhones) {
    const phoneVariants = [normPhone, `+${normPhone}`];

    const lead = await prisma.lead.findFirst({
      where: { user_id: userId, phone_no: { in: phoneVariants } },
    });

    const lastOut = await prisma.messageLog.findFirst({
      where: { lead: { user_id: userId, phone_no: { in: phoneVariants } } },
      include: { campaign: { include: { template: true } } },
      orderBy: { sent_at: 'desc' },
    });

    const lastIn = await prisma.incomingMessage.findFirst({
      where: { user_id: userId, phone_no: { in: phoneVariants } },
      orderBy: { received_at: 'desc' },
    });

    let lastBody = null;
    let lastTs   = null;

    if (lastOut && lastIn) {
      const inTime  = lastIn.received_at  ? new Date(lastIn.received_at)  : new Date(0);
      const outTime = lastOut.sent_at     ? new Date(lastOut.sent_at)     : new Date(0);
      if (inTime > outTime) {
        lastBody = lastIn.body;
        lastTs   = lastIn.received_at;
      } else {
        lastBody = lastOut.body_text || lastOut.campaign?.template?.body?.slice(0, 80) || '📎 Message';
        lastTs   = lastOut.sent_at;
      }
    } else if (lastOut) {
      lastBody = lastOut.body_text || lastOut.campaign?.template?.body?.slice(0, 80) || '📎 Message';
      lastTs   = lastOut.sent_at;
    } else if (lastIn) {
      lastBody = lastIn.body;
      lastTs   = lastIn.received_at;
    }

    const unread = await prisma.incomingMessage.count({
      where: {
        user_id: userId,
        phone_no: { in: phoneVariants },
        is_read: false,
        wa_message_id: { not: 'OUTBOUND_DIRECT' },
      },
    });

    const displayPhone = lead?.phone_no || `+${normPhone}`;

    contacts.push({
      lead_id:         lead?.id || null,
      name:            lead?.name || displayPhone,
      phone_no:        normPhone,
      last_message:    lastBody,
      last_message_at: lastTs,
      unread_count:    unread,
      is_archived:     archivedSet.has(normPhone),
    });
  }

  return contacts;
}

// ── Message thread ────────────────────────────────────────────────────────────

async function getMessages(userId, phoneNo) {
  const normPhone     = normalizePhone(phoneNo);
  const phoneVariants = [...new Set([phoneNo, normPhone, `+${normPhone}`])];
  const messages      = [];

  const lead = await prisma.lead.findFirst({
    where: { user_id: userId, phone_no: { in: phoneVariants } },
  });

  if (lead) {
    const logs = await prisma.messageLog.findMany({
      where: { lead_id: lead.id, status: { not: 'failed' } },
      include: { campaign: { include: { template: true } } },
      orderBy: { sent_at: 'asc' },
    });

    for (const log of logs) {
      messages.push({
        id:            log.id * 10,
        direction:     'outbound',
        body:          log.body_text || log.campaign?.template?.body || '📎 Campaign message',
        timestamp:     log.sent_at,
        status:        log.status,
        campaign_id:   log.campaign_id,
        campaign_name: log.campaign?.name || null,
        is_read:       true,
      });
    }
  }

  const inbound = await prisma.incomingMessage.findMany({
    where: { user_id: userId, phone_no: normPhone },
    orderBy: { received_at: 'asc' },
  });

  for (const msg of inbound) {
    messages.push({
      id:            msg.id * 10 + 1,
      direction:     'inbound',
      body:          msg.body,
      timestamp:     msg.received_at,
      status:        null,
      campaign_id:   null,
      campaign_name: null,
      is_read:       msg.is_read,
    });
  }

  messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  return messages;
}

// ── Send message ──────────────────────────────────────────────────────────────

async function sendMessage(userId, { phone_no, body }) {
  const session = await prisma.whatsAppSession.findUnique({ where: { user_id: userId } });
  if (!session || session.status !== 'connected') {
    throw httpError(400, 'WhatsApp is not connected.');
  }

  const phone = normalizePhone(phone_no);

  if (session.wa_type === 'meta' && session.meta_phone_id && session.meta_access_token) {
    const token = decrypt(session.meta_access_token);
    try {
      const resp = await axios.post(
        `${metaApiBase}/${session.meta_phone_id}/messages`,
        { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 30_000 }
      );
      if (!resp.data?.messages)
        throw httpError(400, resp.data?.error?.message || 'Meta API error');
    } catch (err) {
      if (err.status) throw err;
      throw httpError(400, err.response?.data?.error?.message || 'Meta API error');
    }
  } else {
    // Use the embedded WA bridge directly
    const waBridge = require('../../bridges/whatsapp');
    try {
      await waBridge.sendMessage(userId, `${phone}@c.us`, body);
    } catch (err) {
      throw httpError(400, err.message || 'Bridge send failed');
    }
  }

  await prisma.incomingMessage.create({
    data: {
      user_id:       userId,
      phone_no:      phone,
      body:          `__OUTBOUND__:${body}`,
      is_read:       true,
      wa_message_id: 'OUTBOUND_DIRECT',
    },
  });

  return { success: true };
}

// ── Mark as read ──────────────────────────────────────────────────────────────

async function markRead(userId, phoneNo) {
  await prisma.incomingMessage.updateMany({
    where: { user_id: userId, phone_no: phoneNo, is_read: false },
    data:  { is_read: true },
  });
  return { success: true };
}

// ── Delete contact chat ───────────────────────────────────────────────────────

async function deleteContact(userId, phoneNo) {
  const normPhone = normalizePhone(phoneNo);
  await prisma.incomingMessage.deleteMany({
    where: { user_id: userId, phone_no: { in: [phoneNo, normPhone, `+${normPhone}`] } },
  });
  await prisma.chatSetting.deleteMany({
    where: { user_id: userId, phone_no: { in: [normPhone, `+${normPhone}`] } },
  });
  return { success: true };
}

// ── Archive / Unarchive ───────────────────────────────────────────────────────

async function setArchived(userId, phoneNo, archived) {
  const normPhone = normalizePhone(phoneNo);
  await prisma.chatSetting.upsert({
    where:  { uq_chat_setting_user_phone: { user_id: userId, phone_no: normPhone } },
    update: { is_archived: archived },
    create: { user_id: userId, phone_no: normPhone, is_archived: archived },
  });
  return { success: true };
}

async function getArchivedPhones(userId) {
  const rows = await prisma.chatSetting.findMany({
    where:  { user_id: userId, is_archived: true },
    select: { phone_no: true },
  });
  return new Set(rows.map(r => r.phone_no));
}

module.exports = {
  handleIncoming, getUnreadCount, getContacts, getMessages,
  sendMessage, markRead, deleteContact, setArchived, getArchivedPhones,
};
