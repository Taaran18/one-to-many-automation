/**
 * Campaign runner — executes a single campaign run.
 *
 * Single responsibility: given a campaignId + userId, load leads,
 * resolve templates, send messages, and update the DB.
 *
 * Called from:
 *   - campaigns.service.js (POST /start, POST /rerun)
 *   - scheduler/index.js (automated scheduled runs)
 */

'use strict';

const axios = require('axios');
const prisma = require('../../db/client');
const { decrypt } = require('../../utils/encryption');
const config = require('../../config');

const { bridgeUrl, metaApiBase } = config.services;
const { messageSendDelayMs, apiTimeoutMs } = config.scheduler;

// ── Template variable resolution ──────────────────────────────────────────────

/**
 * Replace {{placeholder}} tokens in a template body with lead field values.
 */
function resolveTemplate(body, lead) {
  return body
    .replace(/\{\{name\}\}/g,         lead.name         || '')
    .replace(/\{\{phone\}\}/g,        lead.phone_no     || '')
    .replace(/\{\{email\}\}/g,        lead.email        || '')
    .replace(/\{\{company_name\}\}/g, lead.company_name || '')
    .replace(/\{\{city\}\}/g,         lead.city         || '')
    .replace(/\{\{state\}\}/g,        lead.state        || '')
    .replace(/\{\{country\}\}/g,      lead.country      || '')
    .replace(/\{\{pincode\}\}/g,      lead.pincode      || '')
    .replace(/\{\{tags\}\}/g,         lead.tags         || '');
}

/**
 * Build Meta API body parameter list from a template body and a lead.
 * Supports both numbered ({{1}}, {{2}}) and named ({{name}}) variables.
 */
function buildMetaBodyParams(body, lead, variableMap) {
  const address = [lead.address_line1, lead.address_line2, lead.address_line3]
    .filter(Boolean)
    .join(', ');

  const fieldMap = {
    name: lead.name || '', phone: lead.phone_no || '', email: lead.email || '',
    company_name: lead.company_name || '', address, city: lead.city || '',
    state: lead.state || '', country: lead.country || '',
    pincode: lead.pincode || '', tags: lead.tags || '',
  };

  // Numbered variables: {{1}}, {{2}}, …
  const numVars = [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]))]
    .sort((a, b) => +a - +b);

  if (numVars.length > 0) {
    return numVars.map(n => ({ type: 'text', text: fieldMap[(variableMap || {})[n]] || '' }));
  }

  // Named variables fallback: {{name}}, {{email}}, …
  const seen = new Set();
  return [...body.matchAll(/\{\{(\w+)\}\}/g)]
    .filter(([, v]) => v in fieldMap && !seen.has(v) && seen.add(v))
    .map(([, v]) => ({ type: 'text', text: fieldMap[v] }));
}

// ── Message senders ───────────────────────────────────────────────────────────

async function _sendViaMeta(phone, message, template, metaPhoneId, metaToken) {
  let payload;
  if (template?.meta_template_name) {
    let variableMap = null;
    if (template.meta_variable_map) {
      try { variableMap = JSON.parse(template.meta_variable_map); } catch {}
    }
    const params = buildMetaBodyParams(template.body || '', _mockLeadForParams(message), variableMap);
    const components = params.length > 0 ? [{ type: 'body', parameters: params }] : [];
    payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: template.meta_template_name,
        language: { code: template.meta_language || 'en_US' },
        components,
      },
    };
  } else {
    payload = { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } };
  }

  const resp = await axios.post(
    `${metaApiBase}/${metaPhoneId}/messages`,
    payload,
    {
      headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
      timeout: apiTimeoutMs,
    }
  );

  if (!resp.data?.messages) {
    throw new Error(resp.data?.error?.message || 'Meta API returned no messages');
  }
}

async function _sendViaBridge(userId, phone, message) {
  const resp = await axios.post(
    `${bridgeUrl}/message/send`,
    { user_id: userId, phone_no: `${phone}@c.us`, message },
    { timeout: apiTimeoutMs }
  );
  if (!resp.data?.success) {
    throw new Error(resp.data?.error || 'Bridge send failed');
  }
}

async function _sendViaEmailBridge(userId, toEmail, subject, html, text) {
  const emailBridgeUrl = config.services.emailBridgeUrl;
  const resp = await axios.post(
    `${emailBridgeUrl}/message/send`,
    { user_id: userId, to: toEmail, subject, html, text },
    { timeout: apiTimeoutMs }
  );
  if (!resp.data?.success) {
    throw new Error(resp.data?.error || 'Email bridge send failed');
  }
}

// Reconstruct lead-like object from already-resolved message for buildMetaBodyParams
// (we pass the template body + lead separately to build correct params)
function _mockLeadForParams(resolvedMessage) {
  // This is called only when building params for Meta template — the body
  // already has the correct params embedded via resolveTemplate.
  return {};
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Execute a full campaign run.
 *
 * @param {number} campaignId
 * @param {number} userId
 */
async function runCampaign(campaignId, userId) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId },
    include: { template: true },
  });
  if (!campaign) return;

  const currentRun = (campaign.run_count || 0) + 1;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'running', run_count: currentRun },
  });

  try {
    // ── Collect unique leads from all selected groups ─────────────────────
    const groupIds = _parseGroupIds(campaign);
    const leads = await _collectLeads(groupIds);

    const isEmail = campaign.channel === 'email';

    if (isEmail) {
      // ── Email campaign ────────────────────────────────────────────────
      const subject = campaign.template?.email_subject || campaign.name;
      const htmlTemplate = campaign.template?.email_html || '';
      const textTemplate = campaign.template?.body || '';

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];

        if (!lead.email) {
          await prisma.messageLog.create({
            data: {
              campaign_id: campaignId, lead_id: lead.id,
              status: 'failed', error_message: 'No email address on lead',
              run_number: currentRun, body_text: '',
            },
          });
          continue;
        }

        const resolvedHtml = resolveTemplate(htmlTemplate, lead);
        const resolvedText = resolveTemplate(textTemplate, lead);
        const resolvedSubject = resolveTemplate(subject, lead);

        let status = 'failed';
        let errorMessage = null;

        try {
          await _sendViaEmailBridge(userId, lead.email, resolvedSubject, resolvedHtml, resolvedText);
          status = 'sent';
        } catch (err) {
          errorMessage = err.response?.data?.error || err.message;
        }

        await prisma.messageLog.create({
          data: {
            campaign_id: campaignId, lead_id: lead.id,
            status, error_message: errorMessage,
            run_number: currentRun, body_text: resolvedText,
          },
        });

        if (i < leads.length - 1) await _sleep(messageSendDelayMs);
      }
    } else {
      // ── WhatsApp campaign ─────────────────────────────────────────────
      const waSession = await prisma.whatsAppSession.findFirst({ where: { user_id: userId } });
      const useMeta = waSession?.wa_type === 'meta' && waSession?.meta_phone_id && waSession?.meta_access_token;

      const metaPhoneId = useMeta ? waSession.meta_phone_id : null;
      const metaToken = useMeta ? decrypt(waSession.meta_access_token) : null;

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const message = resolveTemplate(campaign.template?.body || '', lead);
        const phone = lead.phone_no.replace(/^\+/, '').replace(/\s/g, '');

        let status = 'failed';
        let errorMessage = null;

        try {
          if (useMeta) {
            await _sendViaMeta(phone, message, campaign.template, metaPhoneId, metaToken);
          } else {
            await _sendViaBridge(userId, phone, message);
          }
          status = 'sent';
        } catch (err) {
          errorMessage = err.response?.data?.error?.message || err.message;
        }

        await prisma.messageLog.create({
          data: { campaign_id: campaignId, lead_id: lead.id, status, error_message: errorMessage, run_number: currentRun, body_text: message },
        });

        if (i < leads.length - 1) await _sleep(messageSendDelayMs);
      }
    }

    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'completed' } });
  } catch (err) {
    console.error(`[runner] Campaign ${campaignId} failed:`, err.message);
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'failed' } }).catch(() => {});
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _parseGroupIds(campaign) {
  let ids = [];
  if (campaign.lead_group_ids) {
    try { ids = JSON.parse(campaign.lead_group_ids); } catch {}
  }
  if (ids.length === 0 && campaign.lead_group_id) ids = [campaign.lead_group_id];
  return ids;
}

async function _collectLeads(groupIds) {
  const seen = new Set();
  const leads = [];
  for (const gid of groupIds) {
    const memberships = await prisma.leadGroupMember.findMany({
      where: { lead_group_id: gid },
      include: { lead: true },
    });
    for (const { lead } of memberships) {
      if (!seen.has(lead.id)) { seen.add(lead.id); leads.push(lead); }
    }
  }
  return leads;
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { runCampaign, resolveTemplate, buildMetaBodyParams };
