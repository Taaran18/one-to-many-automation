'use strict';

const prisma      = require('../../db/client');
const { httpError } = require('../../utils/errors');
const emailBridge   = require('../../bridges/email');

async function getOrCreateSession(userId) {
  const existing = await prisma.emailSession.findUnique({ where: { user_id: userId } });
  if (existing) return existing;
  return prisma.emailSession.create({ data: { user_id: userId, status: 'disconnected' } });
}

// ── Status ────────────────────────────────────────────────────────────────────

async function getStatus(userId) {
  await getOrCreateSession(userId);
  const { status, email, display_name } = emailBridge.getStatus(userId);
  if (status === 'connected') {
    await prisma.emailSession.update({
      where: { user_id: userId },
      data:  { status, last_seen: new Date() },
    });
  }
  return { status, email, display_name };
}

// ── Connect ───────────────────────────────────────────────────────────────────

async function connect(userId, { email, password, provider, smtp_host, smtp_port, display_name }) {
  if (!email || !password) throw httpError(400, 'Email and password are required');

  try {
    await emailBridge.connect(userId, { email, password, provider, smtp_host, smtp_port, display_name });

    await prisma.emailSession.upsert({
      where:  { user_id: userId },
      update: { email, display_name: display_name || email, provider: provider || 'custom', smtp_host, smtp_port: smtp_port ? parseInt(smtp_port) : null, status: 'connected', last_seen: new Date() },
      create: { user_id: userId, email, display_name: display_name || email, provider: provider || 'custom', smtp_host, smtp_port: smtp_port ? parseInt(smtp_port) : null, status: 'connected', last_seen: new Date() },
    });

    return { status: 'connected', email };
  } catch (err) {
    if (err.status) throw err;
    throw httpError(400, err.message || 'Could not connect to email');
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────

async function disconnect(userId) {
  emailBridge.disconnect(userId);
  await prisma.emailSession.updateMany({
    where: { user_id: userId },
    data:  { status: 'disconnected' },
  });
  return { success: true };
}

// ── Send email ────────────────────────────────────────────────────────────────

async function sendEmail(userId, { to, subject, html, text }) {
  const session = await getOrCreateSession(userId);
  if (session.status !== 'connected') throw httpError(400, 'Email is not connected');
  if (!to || !subject)                throw httpError(400, 'to and subject are required');

  try {
    const result = await emailBridge.sendMail(userId, { to, subject, html, text });
    return { success: true, message_id: result.message_id };
  } catch (err) {
    if (err.status) throw err;
    throw httpError(400, err.message || 'Email send failed');
  }
}

// ── Mail page: contacts ───────────────────────────────────────────────────────

async function getEmailContacts(userId) {
  const rows = await prisma.messageLog.findMany({
    where: {
      campaign: { user_id: userId, channel: 'email' },
      lead_id:  { not: null },
    },
    distinct: ['lead_id'],
    include:  { lead: true },
    orderBy:  { sent_at: 'desc' },
  });

  const seen = new Map();
  for (const row of rows) {
    if (!row.lead) continue;
    if (!seen.has(row.lead_id)) {
      seen.set(row.lead_id, {
        lead_id:         row.lead_id,
        name:            row.lead.name,
        email:           row.lead.email || '',
        last_subject:    (() => { try { return JSON.parse(row.body_text || '{}').subject || ''; } catch { return ''; } })(),
        last_message_at: row.sent_at,
        last_snippet:    (() => { try { return JSON.parse(row.body_text || '{}').text || ''; } catch { return row.body_text || ''; } })(),
      });
    }
  }

  return [...seen.values()];
}

// ── Mail page: thread ─────────────────────────────────────────────────────────

async function getEmailThread(userId, leadId) {
  const logs = await prisma.messageLog.findMany({
    where:   { campaign: { user_id: userId, channel: 'email' }, lead_id: Number(leadId) },
    include: { campaign: { include: { template: true } } },
    orderBy: { sent_at: 'asc' },
  });

  return logs.map(log => {
    let subject = '', text = '', html = '';
    try {
      const parsed = JSON.parse(log.body_text || '');
      subject = parsed.subject || '';
      text    = parsed.text    || '';
      html    = parsed.html    || '';
    } catch {
      text = log.body_text || '';
    }
    if (!subject && log.campaign?.template?.email_subject) {
      subject = log.campaign.template.email_subject;
    }
    return {
      id:            log.id,
      campaign_id:   log.campaign_id,
      campaign_name: log.campaign?.name || '',
      status:        log.status,
      sent_at:       log.sent_at,
      error_message: log.error_message,
      subject, text, html,
      direction:     'outbound',
    };
  });
}

// ── Mail page: compose direct ─────────────────────────────────────────────────

async function composeDirect(userId, leadId, { subject, text, html }) {
  if (!subject)       throw httpError(400, 'subject is required');
  if (!text && !html) throw httpError(400, 'text or html body is required');

  const lead = await prisma.lead.findFirst({ where: { id: Number(leadId), user_id: userId } });
  if (!lead)        throw httpError(404, 'Lead not found');
  if (!lead.email)  throw httpError(400, 'This lead has no email address');

  let campaign = await prisma.campaign.findFirst({
    where: { user_id: userId, name: '__direct_mail__', channel: 'email' },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: { user_id: userId, name: '__direct_mail__', channel: 'email', status: 'running' },
    });
  }

  const session = await getOrCreateSession(userId);
  if (session.status !== 'connected') throw httpError(400, 'Email is not connected');

  let sendError = null;
  try {
    await emailBridge.sendMail(userId, { to: lead.email, subject, html: html || text, text });
  } catch (err) {
    sendError = err.message || 'Email send error';
  }

  const log = await prisma.messageLog.create({
    data: {
      campaign_id:   campaign.id,
      lead_id:       Number(leadId),
      status:        sendError ? 'failed' : 'sent',
      error_message: sendError || null,
      body_text:     JSON.stringify({ subject, text, html: html || '' }),
    },
  });

  if (sendError) throw httpError(400, sendError);
  return { success: true, log_id: log.id };
}

// ── Mail page: delete contact email history ───────────────────────────────────

async function deleteEmailContact(userId, leadId) {
  await prisma.messageLog.deleteMany({
    where: {
      campaign: { user_id: userId, channel: 'email' },
      lead_id:  Number(leadId),
    },
  });
  return { success: true };
}

module.exports = { getStatus, connect, disconnect, sendEmail, getEmailContacts, getEmailThread, composeDirect, deleteEmailContact };
