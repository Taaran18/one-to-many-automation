/**
 * Meta Business API service for templates.
 *
 * Single responsibility: all interactions with the Meta Graph API
 * related to WhatsApp message templates.
 *
 * Also exports getMetaCredentials() — used by templates, campaigns, and
 * chats since they all need the stored WhatsApp session credentials.
 */

'use strict';

const axios = require('axios');
const prisma = require('../../db/client');
const { decrypt } = require('../../utils/encryption');
const { httpError } = require('../../utils/errors');
const config = require('../../config');

const { metaApiBase } = config.services;

// ── Shared credential loader ──────────────────────────────────────────────────

/**
 * Load and decrypt Meta API credentials for a user's WhatsApp session.
 * Resolves missing WABA ID on the fly if possible.
 *
 * Used by: templates, campaigns/runner, chats.
 *
 * @param {number} userId
 * @returns {{ wabaId: string, token: string, phoneId: string }}
 */
async function getMetaCredentials(userId) {
  const session = await prisma.whatsAppSession.findFirst({
    where: { user_id: userId, wa_type: 'meta' },
  });

  if (!session?.meta_access_token) {
    throw httpError(400, 'No active Meta Business API connection. Connect via Meta first.');
  }

  const token = decrypt(session.meta_access_token);

  // Attempt to resolve missing WABA ID from the phone ID
  if (!session.meta_waba_id && session.meta_phone_id) {
    try {
      const resp = await axios.get(`${metaApiBase}/${session.meta_phone_id}`, {
        params: { fields: 'whatsapp_business_account', access_token: token },
        timeout: 10_000,
      });
      const wabaId = resp.data?.whatsapp_business_account?.id;
      if (wabaId) {
        await prisma.whatsAppSession.update({ where: { id: session.id }, data: { meta_waba_id: wabaId } });
        session.meta_waba_id = wabaId;
      }
    } catch { /* non-fatal — fall through to error below */ }
  }

  if (!session.meta_waba_id) {
    throw httpError(
      400,
      'Could not determine WhatsApp Business Account ID. Please disconnect and reconnect via Meta API.'
    );
  }

  return { wabaId: session.meta_waba_id, token, phoneId: session.meta_phone_id };
}

// ── Template operations ───────────────────────────────────────────────────────

/**
 * Fetch all templates from Meta Business API and upsert into local DB.
 */
async function syncTemplates(userId) {
  const { wabaId, token } = await getMetaCredentials(userId);

  let metaTemplates;
  try {
    const resp = await axios.get(`${metaApiBase}/${wabaId}/message_templates`, {
      params: { access_token: token, fields: 'name,status,category,language,components', limit: 200 },
      timeout: 15_000,
    });
    metaTemplates = resp.data?.data || [];
  } catch (err) {
    const detail = err.response?.data?.error?.message || 'Meta API error.';
    const status = err.response ? 400 : 503;
    throw httpError(status, status === 503 ? 'Could not reach Meta Graph API.' : detail);
  }

  for (const mt of metaTemplates) {
    const metaName = mt.name || '';
    const bodyText = (mt.components || []).find(c => c.type === 'BODY')?.text || '';

    const existing = await prisma.template.findFirst({
      where: { user_id: userId, meta_template_name: metaName },
    });

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          meta_status: mt.status || null,
          meta_category: mt.category || null,
          meta_language: mt.language || null,
          body: bodyText,
        },
      });
    } else {
      await prisma.template.create({
        data: {
          user_id: userId,
          name: metaName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          body: bodyText,
          connection_type: 'meta',
          meta_template_name: metaName,
          meta_category: mt.category || null,
          meta_status: mt.status || null,
          meta_language: mt.language || null,
        },
      });
    }
  }

  return prisma.template.findMany({
    where: { user_id: userId, connection_type: 'meta' },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Submit a new template to Meta for approval and save it locally.
 */
async function createMetaTemplate(userId, body) {
  const { wabaId, token } = await getMetaCredentials(userId);

  const components = _buildTemplateComponents(body);
  const payload = {
    name: body.meta_template_name,
    category: body.category,
    language: body.language,
    components,
  };

  let metaStatus = 'PENDING';
  try {
    const resp = await axios.post(
      `${metaApiBase}/${wabaId}/message_templates`,
      payload,
      { params: { access_token: token }, timeout: 15_000 }
    );
    metaStatus = resp.data?.status || 'PENDING';
  } catch (err) {
    if (err.response) {
      const errBody = err.response.data?.error || {};
      const detail = errBody.error_user_msg || errBody.message || 'Meta API error.';
      console.error('[meta] Template creation failed:', err.response.data);
      throw httpError(400, detail);
    }
    throw httpError(503, 'Could not reach Meta Graph API.');
  }

  return prisma.template.create({
    data: {
      user_id: userId,
      name: body.name,
      body: body.body,
      connection_type: 'meta',
      meta_template_name: body.meta_template_name,
      meta_category: body.category,
      meta_status: metaStatus,
      meta_header_image_url: body.header_image_url || null,
      meta_language: body.language,
      meta_variable_map: body.meta_variable_map || null,
    },
  });
}

/**
 * Refresh the approval status of a single Meta template from the API.
 */
async function refreshTemplateStatus(userId, templateId) {
  const { wabaId, token } = await getMetaCredentials(userId);

  const template = await prisma.template.findFirst({
    where: { id: templateId, user_id: userId, connection_type: 'meta' },
  });
  if (!template) throw httpError(404, 'Template not found');

  try {
    const resp = await axios.get(`${metaApiBase}/${wabaId}/message_templates`, {
      params: { name: template.meta_template_name, access_token: token, fields: 'name,status,category' },
      timeout: 10_000,
    });
    const data = resp.data?.data || [];
    if (data.length > 0) {
      await prisma.template.update({
        where: { id: templateId },
        data: { meta_status: data[0].status || template.meta_status },
      });
    }
  } catch { /* non-fatal — return current DB state */ }

  return prisma.template.findUnique({ where: { id: templateId } });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _buildTemplateComponents({ header, header_image_url, body, footer, buttons, variable_samples }) {
  const components = [];

  if (header_image_url) {
    components.push({ type: 'HEADER', format: 'IMAGE' });
  } else if (header) {
    components.push({ type: 'HEADER', format: 'TEXT', text: header });
  }

  const bodyComponent = { type: 'BODY', text: body };
  if (variable_samples?.length > 0) {
    bodyComponent.example = { body_text: [variable_samples] };
  }
  components.push(bodyComponent);

  if (footer) components.push({ type: 'FOOTER', text: footer });

  if (buttons?.length > 0) {
    const btnList = buttons.map(b => {
      const btn = { type: b.type, text: b.text };
      if (b.type === 'URL' && b.url) btn.url = b.url;
      if (b.type === 'PHONE_NUMBER' && b.phone_number) btn.phone_number = b.phone_number;
      return btn;
    });
    components.push({ type: 'BUTTONS', buttons: btnList });
  }

  return components;
}

module.exports = { getMetaCredentials, syncTemplates, createMetaTemplate, refreshTemplateStatus };
