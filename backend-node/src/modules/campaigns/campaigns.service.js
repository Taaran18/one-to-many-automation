/**
 * Campaigns service — campaign lifecycle and CRUD business logic.
 *
 * Campaign execution (the actual message-sending loop) lives in runner.js.
 */

'use strict';

const prisma = require('../../db/client');
const { httpError } = require('../../utils/errors');
const { runCampaign } = require('./runner');

// ── Response DTO builder ──────────────────────────────────────────────────────

/**
 * Enrich a campaign record with counts and related-entity names.
 * All campaign API responses pass through this function.
 */
async function buildResponse(c) {
  const [sent, failed] = await Promise.all([
    prisma.messageLog.count({ where: { campaign_id: c.id, status: 'sent' } }),
    prisma.messageLog.count({ where: { campaign_id: c.id, status: 'failed' } }),
  ]);

  let groupIds = [];
  if (c.lead_group_ids) {
    try { groupIds = JSON.parse(c.lead_group_ids); } catch {}
  }

  const groupNames = [];
  for (const gid of groupIds) {
    const grp = await prisma.leadGroup.findUnique({ where: { id: gid } });
    if (grp) groupNames.push(grp.name);
  }

  const template = c.template ?? (c.template_id ? await prisma.template.findUnique({ where: { id: c.template_id } }) : null);
  const leadGroup = c.lead_group ?? (c.lead_group_id ? await prisma.leadGroup.findUnique({ where: { id: c.lead_group_id } }) : null);

  return {
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    template_id: c.template_id,
    lead_group_id: c.lead_group_id,
    lead_group_ids: groupIds.length > 0 ? groupIds : null,
    status: c.status,
    scheduled_at: c.scheduled_at,
    stop_at: c.stop_at,
    created_at: c.created_at,
    recurrence: c.recurrence || 'one_time',
    recurrence_config: c.recurrence_config,
    tags: c.tags,
    channel: c.channel || 'whatsapp',
    template_name: template?.name || null,
    lead_group_name: leadGroup?.name || null,
    lead_group_names: groupNames.length > 0 ? groupNames : null,
    messages_sent: sent,
    messages_failed: failed,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function createCampaign(userId, data) {
  const {
    name, template_id, lead_group_id, lead_group_ids,
    scheduled_at, stop_at, recurrence, recurrence_config, tags, channel,
  } = data;

  const allGroupIds = lead_group_ids || (lead_group_id ? [lead_group_id] : []);
  const primaryGroupId = lead_group_id || allGroupIds[0] || null;

  const campaign = await prisma.campaign.create({
    data: {
      user_id: userId,
      name,
      template_id: template_id || null,
      lead_group_id: primaryGroupId,
      lead_group_ids: allGroupIds.length > 0 ? JSON.stringify(allGroupIds) : null,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      stop_at: stop_at ? new Date(stop_at) : null,
      channel: channel || 'whatsapp',
      recurrence: recurrence || 'one_time',
      recurrence_config: recurrence_config || null,
      tags: tags || null,
      status: scheduled_at ? 'scheduled' : 'draft',
    },
    include: { template: true, lead_group: true },
  });

  return buildResponse(campaign);
}

async function listCampaigns(userId, statusFilter) {
  const where = { user_id: userId };
  if (statusFilter) where.status = statusFilter;

  const campaigns = await prisma.campaign.findMany({
    where,
    include: { template: true, lead_group: true },
    orderBy: { created_at: 'desc' },
  });

  return Promise.all(campaigns.map(buildResponse));
}

async function getCampaign(userId, campaignId) {
  const c = await prisma.campaign.findFirst({
    where: { id: campaignId, user_id: userId },
    include: { template: true, lead_group: true },
  });
  if (!c) throw httpError(404, 'Campaign not found');
  return buildResponse(c);
}

async function updateCampaign(userId, campaignId, data) {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, user_id: userId } });
  if (!c) throw httpError(404, 'Campaign not found');

  const { tags, ...nonTagFields } = data;
  if (Object.keys(nonTagFields).length > 0 && !['draft', 'scheduled'].includes(c.status)) {
    throw httpError(400, 'Cannot edit a running or completed campaign');
  }

  const updateData = { ...data };
  if (data.scheduled_at) updateData.scheduled_at = new Date(data.scheduled_at);
  if (data.stop_at) updateData.stop_at = new Date(data.stop_at);
  if (updateData.scheduled_at && c.status === 'draft') updateData.status = 'scheduled';

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: updateData,
    include: { template: true, lead_group: true },
  });
  return buildResponse(updated);
}

async function deleteCampaign(userId, campaignId) {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, user_id: userId } });
  if (!c) throw httpError(404, 'Campaign not found');
  // Delete child message logs first to satisfy the foreign key constraint
  await prisma.messageLog.deleteMany({ where: { campaign_id: campaignId } });
  await prisma.campaign.delete({ where: { id: campaignId } });
}

// ── Lifecycle actions ─────────────────────────────────────────────────────────

async function startCampaign(userId, campaignId) {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, user_id: userId } });
  if (!c) throw httpError(404, 'Campaign not found');
  if (c.status === 'running') throw httpError(400, 'Campaign is already running');
  if (c.status === 'completed') throw httpError(400, 'Campaign already completed');

  // Fire-and-forget
  runCampaign(campaignId, userId).catch(err =>
    console.error(`[campaigns] Error running campaign ${campaignId}:`, err.message)
  );
}

async function rerunCampaign(userId, campaignId) {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, user_id: userId } });
  if (!c) throw httpError(404, 'Campaign not found');
  if (c.status === 'running') throw httpError(400, 'Campaign is already running');

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'draft' } });

  runCampaign(campaignId, userId).catch(err =>
    console.error(`[campaigns] Error rerunning campaign ${campaignId}:`, err.message)
  );
}

async function stopCampaign(userId, campaignId) {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, user_id: userId } });
  if (!c) throw httpError(404, 'Campaign not found');
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'draft' } });
}

async function duplicateCampaign(userId, campaignId) {
  const c = await prisma.campaign.findFirst({
    where: { id: campaignId, user_id: userId },
    include: { template: true, lead_group: true },
  });
  if (!c) throw httpError(404, 'Campaign not found');

  const newC = await prisma.campaign.create({
    data: {
      user_id: userId,
      name: `${c.name} (Copy)`,
      template_id: c.template_id || null,
      lead_group_id: c.lead_group_id || null,
      status: 'draft',
    },
    include: { template: true, lead_group: true },
  });
  return buildResponse(newC);
}

// ── Logs ──────────────────────────────────────────────────────────────────────

async function getCampaignLogs(userId, campaignId, page = 1, limit = 200) {
  const c = await prisma.campaign.findFirst({ where: { id: campaignId, user_id: userId } });
  if (!c) throw httpError(404, 'Campaign not found');

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10)));

  const logs = await prisma.messageLog.findMany({
    where: { campaign_id: campaignId },
    include: { lead: true },
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  });

  return logs.map(log => ({
    id: log.id,
    campaign_id: log.campaign_id,
    lead_id: log.lead_id,
    status: log.status,
    sent_at: log.sent_at,
    error_message: log.error_message,
    lead_name: log.lead?.name || null,
    lead_phone: log.lead?.phone_no || null,
    lead_email: log.lead?.email || null,
    run_number: log.run_number || 1,
  }));
}

module.exports = {
  createCampaign, listCampaigns, getCampaign, updateCampaign, deleteCampaign,
  startCampaign, rerunCampaign, stopCampaign, duplicateCampaign, getCampaignLogs,
};
