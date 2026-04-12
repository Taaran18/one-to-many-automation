/**
 * Templates service — QR template CRUD business logic.
 *
 * Meta-specific operations (sync, create, refresh) live in meta.service.js.
 */

'use strict';

const prisma = require('../../db/client');
const { httpError } = require('../../utils/errors');

const META_EDITABLE_FIELDS = new Set(['name', 'tags', 'body', 'meta_variable_map']);

async function createTemplate(userId, { name, body, tags }) {
  return prisma.template.create({
    data: { user_id: userId, name, body, tags: tags || null, connection_type: 'qr' },
  });
}

async function createEmailTemplate(userId, { name, body, tags, email_subject, email_html }) {
  return prisma.template.create({
    data: {
      user_id: userId,
      name,
      body: body || '',
      tags: tags || null,
      connection_type: 'email',
      email_subject: email_subject || null,
      email_html: email_html || null,
    },
  });
}

async function listTemplates(userId) {
  return prisma.template.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

async function getTemplate(userId, templateId) {
  const template = await prisma.template.findFirst({ where: { id: templateId, user_id: userId } });
  if (!template) throw httpError(404, 'Template not found');
  return template;
}

async function updateTemplate(userId, templateId, data) {
  const template = await getTemplate(userId, templateId);

  // Meta templates only allow updating a restricted set of fields
  const updateData = template.connection_type === 'meta'
    ? Object.fromEntries(Object.entries(data).filter(([k]) => META_EDITABLE_FIELDS.has(k)))
    : data;

  return prisma.template.update({ where: { id: templateId }, data: updateData });
}

async function deleteTemplate(userId, templateId) {
  await getTemplate(userId, templateId); // assert ownership

  // Nullify template_id on any campaigns that reference this template
  await prisma.campaign.updateMany({ where: { template_id: templateId }, data: { template_id: null } });
  await prisma.template.delete({ where: { id: templateId } });
}

module.exports = { createTemplate, createEmailTemplate, listTemplates, getTemplate, updateTemplate, deleteTemplate };
