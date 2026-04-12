/**
 * Campaign scheduler — cron orchestration only.
 *
 * Single responsibility: tick every minute, find campaigns that are due,
 * mark them as running, fire execution, and reschedule recurring ones.
 *
 * Campaign execution logic lives in modules/campaigns/runner.js.
 * Recurrence date math lives in scheduler/recurrence.js.
 */

'use strict';

const cron = require('node-cron');
const prisma = require('../db/client');
const config = require('../config');
const { computeNextRun, toUtc } = require('./recurrence');
const { runCampaign } = require('../modules/campaigns/runner');

// ── Reschedule after a run ────────────────────────────────────────────────────

async function _rescheduleIfRecurring(campaignId, recurrence, recurrenceConfig, scheduledAt, stopAt) {
  if (!recurrence || recurrence === 'one_time') return;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;

  const nextRun = computeNextRun(scheduledAt, recurrence, recurrenceConfig);

  if (stopAt) {
    const stopAtUtc = toUtc(stopAt);
    if (!nextRun || nextRun > stopAtUtc) {
      console.log(`[scheduler] Campaign ${campaignId} reached stop_at — reverting to draft`);
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'draft' } });
      return;
    }
  }

  if (nextRun) {
    console.log(`[scheduler] Campaign ${campaignId} rescheduled → ${nextRun.toISOString()}`);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { scheduled_at: nextRun, status: 'scheduled' },
    });
  } else {
    console.log(`[scheduler] Campaign ${campaignId} has no next run — reverting to draft`);
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'draft' } });
  }
}

// ── Run + reschedule wrapper ──────────────────────────────────────────────────

async function _runAndReschedule(campaign) {
  await runCampaign(campaign.id, campaign.user_id);
  await _rescheduleIfRecurring(
    campaign.id,
    campaign.recurrence || 'one_time',
    campaign.recurrence_config,
    campaign.scheduled_at,
    campaign.stop_at
  );
}

// ── Main tick ─────────────────────────────────────────────────────────────────

async function _checkDueCampaigns() {
  const now = new Date();

  let dueCampaigns;
  try {
    dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: { not: null, lte: now },
      },
    });
  } catch (err) {
    console.error('[scheduler] DB error while checking campaigns:', err.message);
    return;
  }

  for (const campaign of dueCampaigns) {
    // Mark running immediately — prevents double-execution on the next tick
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'running' } });

    // Fire-and-forget: each campaign runs independently
    _runAndReschedule(campaign).catch(err =>
      console.error(`[scheduler] Unhandled error in campaign ${campaign.id}:`, err.message)
    );
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

function startScheduler() {
  // node-cron '* * * * *' = every minute (same as APScheduler interval(minutes=1))
  cron.schedule('* * * * *', () => {
    _checkDueCampaigns().catch(err =>
      console.error('[scheduler] Uncaught error in tick:', err.message)
    );
  });

  const interval = config.scheduler.checkIntervalSeconds;
  console.log(`[scheduler] Campaign scheduler started — checking every ${interval}s`);
}

module.exports = { startScheduler };
