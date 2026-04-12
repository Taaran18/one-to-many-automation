/**
 * Leads service — individual lead CRUD business logic.
 */

'use strict';

const prisma = require('../../db/client');
const { httpError } = require('../../utils/errors');

/**
 * Create a new lead for a user.
 */
async function createLead(userId, data) {
  const { status, ...rest } = data;
  return prisma.lead.create({
    data: { user_id: userId, status: status || 'prospect', ...rest },
  });
}

/**
 * List leads with optional search, status filter, and pagination.
 */
async function listLeads(userId, { search, status, page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));

  const where = { user_id: userId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name:     { contains: search, mode: 'insensitive' } },
      { phone_no: { contains: search, mode: 'insensitive' } },
      { email:    { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.lead.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  });
}

/**
 * Fetch a single lead, asserting ownership.
 */
async function getLead(userId, leadId) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, user_id: userId } });
  if (!lead) throw httpError(404, 'Lead not found');
  return lead;
}

/**
 * Update a lead's fields.
 */
async function updateLead(userId, leadId, data) {
  await getLead(userId, leadId); // assert ownership
  return prisma.lead.update({ where: { id: leadId }, data });
}

/**
 * Delete a lead. Group memberships are removed first (DB cascade handles it,
 * but the explicit delete prevents any FK violation edge cases).
 */
async function deleteLead(userId, leadId) {
  await getLead(userId, leadId); // assert ownership
  await prisma.leadGroupMember.deleteMany({ where: { lead_id: leadId } });
  await prisma.lead.delete({ where: { id: leadId } });
}

/**
 * Bulk-import an array of lead objects.
 * Creates each lead individually — partial failures are acceptable.
 */
async function importLeads(userId, items) {
  const created = [];
  for (const item of items) {
    const { status, ...rest } = item;
    const lead = await prisma.lead.create({
      data: { user_id: userId, status: status || 'prospect', ...rest },
    });
    created.push(lead);
  }
  return created;
}

/**
 * Return the group IDs a lead belongs to.
 */
async function getLeadGroups(userId, leadId) {
  await getLead(userId, leadId); // assert ownership
  const memberships = await prisma.leadGroupMember.findMany({
    where: { lead_id: leadId },
    select: { lead_group_id: true },
  });
  return { group_ids: memberships.map(m => m.lead_group_id) };
}

module.exports = { createLead, listLeads, getLead, updateLead, deleteLead, importLeads, getLeadGroups };
