/**
 * Dashboard service — analytics queries.
 */

'use strict';

const prisma = require('../../db/client');

async function getStats(userId) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads, totalTemplates, totalCampaigns,
    campaignsNext7Days,
    totalCustomers, totalProspects,
    // Per-channel campaign counts
    waCampaigns, emailCampaigns,
    // Per-channel messages this month
    waMessagesThisMonth, emailMessagesThisMonth,
    // Session statuses
    waSession, emailSession,
  ] = await Promise.all([
    prisma.lead.count({ where: { user_id: userId } }),
    prisma.template.count({ where: { user_id: userId } }),
    prisma.campaign.count({ where: { user_id: userId } }),
    prisma.campaign.count({
      where: { user_id: userId, scheduled_at: { gte: now, lte: weekEnd } },
    }),
    prisma.lead.count({ where: { user_id: userId, status: 'customer' } }),
    prisma.lead.count({ where: { user_id: userId, status: 'prospect' } }),
    // WA campaigns
    prisma.campaign.count({ where: { user_id: userId, channel: 'whatsapp' } }),
    // Email campaigns
    prisma.campaign.count({ where: { user_id: userId, channel: 'email' } }),
    // WA messages this month
    prisma.messageLog.count({
      where: { sent_at: { gte: monthStart }, campaign: { user_id: userId, channel: 'whatsapp' } },
    }),
    // Email messages this month
    prisma.messageLog.count({
      where: { sent_at: { gte: monthStart }, campaign: { user_id: userId, channel: 'email' } },
    }),
    // Session statuses
    prisma.whatsAppSession.findUnique({ where: { user_id: userId }, select: { status: true } }),
    prisma.emailSession.findUnique({ where: { user_id: userId }, select: { status: true } }),
  ]);

  const messagesThisMonth = waMessagesThisMonth + emailMessagesThisMonth;

  // Distinct leads that received at least one successful message (either channel)
  const touchedRows = await prisma.messageLog.findMany({
    where: { status: 'sent', campaign: { user_id: userId }, lead_id: { not: null } },
    select: { lead_id: true },
    distinct: ['lead_id'],
  });

  return {
    total_leads: totalLeads,
    leads_touched: touchedRows.length,
    total_templates: totalTemplates,
    total_campaigns: totalCampaigns,
    campaigns_next_7_days: campaignsNext7Days,
    messages_sent_this_month: messagesThisMonth,
    total_customers: totalCustomers,
    total_prospects: totalProspects,
    // Channel breakdown
    wa_campaigns: waCampaigns,
    email_campaigns: emailCampaigns,
    wa_sent_this_month: waMessagesThisMonth,
    email_sent_this_month: emailMessagesThisMonth,
    wa_status: waSession?.status || 'disconnected',
    email_status: emailSession?.status || 'disconnected',
  };
}

async function getSchedule(userId) {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const campaigns = await prisma.campaign.findMany({
    where: { user_id: userId, scheduled_at: { gte: now, lte: end } },
    include: { lead_group: true, template: true },
    orderBy: { scheduled_at: 'asc' },
    take: 10,
  });

  return campaigns.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    scheduled_at: c.scheduled_at,
    lead_group_name: c.lead_group?.name || null,
    template_name: c.template?.name || null,
  }));
}

async function getChart(userId) {
  const now = new Date();
  const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw`
    SELECT
      DATE(ml.sent_at)    AS date,
      COUNT(ml.id)::int   AS count
    FROM message_logs ml
    JOIN campaigns c ON ml.campaign_id = c.id
    WHERE c.user_id = ${userId}
      AND ml.sent_at >= ${start}
    GROUP BY DATE(ml.sent_at)
    ORDER BY DATE(ml.sent_at) ASC
  `;

  return rows.map(r => ({ date: String(r.date).split('T')[0], count: r.count }));
}

module.exports = { getStats, getSchedule, getChart };
