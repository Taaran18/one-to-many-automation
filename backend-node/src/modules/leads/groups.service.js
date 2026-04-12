/**
 * Lead groups service — group CRUD and membership management.
 *
 * Deliberately separate from leads.service.js: groups are a distinct
 * entity with their own lifecycle even though they contain leads.
 */

'use strict';

const prisma = require('../../db/client');
const { httpError } = require('../../utils/errors');

// ── Internal helper ───────────────────────────────────────────────────────────

async function _getGroup(userId, groupId) {
  const group = await prisma.leadGroup.findFirst({ where: { id: groupId, user_id: userId } });
  if (!group) throw httpError(404, 'Group not found');
  return group;
}

async function _withMemberCount(group) {
  const member_count = await prisma.leadGroupMember.count({ where: { lead_group_id: group.id } });
  return { ...group, member_count };
}

// ── Public API ────────────────────────────────────────────────────────────────

async function listGroups(userId) {
  const groups = await prisma.leadGroup.findMany({ where: { user_id: userId } });
  return Promise.all(groups.map(_withMemberCount));
}

async function createGroup(userId, { name, description }) {
  const group = await prisma.leadGroup.create({
    data: { user_id: userId, name, description: description || null },
  });
  return _withMemberCount(group);
}

async function updateGroup(userId, groupId, data) {
  const group = await _getGroup(userId, groupId);
  const updated = await prisma.leadGroup.update({
    where: { id: group.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
  return _withMemberCount(updated);
}

async function deleteGroup(userId, groupId) {
  await _getGroup(userId, groupId);
  await prisma.leadGroup.delete({ where: { id: groupId } });
}

/**
 * Add lead IDs to a group. Silently skips already-present members.
 * @returns {{ added: number }}
 */
async function addMembers(userId, groupId, leadIds) {
  await _getGroup(userId, groupId);

  // Only add leads that belong to this user
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, user_id: userId },
    select: { id: true },
  });

  let added = 0;
  for (const { id: leadId } of leads) {
    const exists = await prisma.leadGroupMember.findUnique({
      where: { lead_group_id_lead_id: { lead_group_id: groupId, lead_id: leadId } },
    });
    if (!exists) {
      await prisma.leadGroupMember.create({ data: { lead_group_id: groupId, lead_id: leadId } });
      added++;
    }
  }
  return { success: true, added };
}

/**
 * Remove specific lead IDs from a group.
 */
async function removeMembers(userId, groupId, leadIds) {
  await _getGroup(userId, groupId);
  await prisma.leadGroupMember.deleteMany({
    where: { lead_group_id: groupId, lead_id: { in: leadIds } },
  });
  return { success: true };
}

module.exports = { listGroups, createGroup, updateGroup, deleteGroup, addMembers, removeMembers };
