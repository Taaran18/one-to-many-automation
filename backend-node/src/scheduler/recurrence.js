/**
 * Recurrence calculator — single responsibility: next-run date arithmetic.
 *
 * Pure functions only. No database access. No side effects.
 * Ported directly from scheduler.py::compute_next_run().
 */

'use strict';

// ISO weekday map: name → 1 (Mon) … 7 (Sun)
const DAY_ISO = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 7,
};

/**
 * Ensure a Date is treated as UTC (Prisma already returns UTC Date objects).
 * @param {Date|string} dt
 * @returns {Date}
 */
function toUtc(dt) {
  return dt instanceof Date ? dt : new Date(dt);
}

/**
 * Compute the next UTC Date a recurring campaign should fire.
 *
 * @param {Date}        scheduledAt      When the campaign last ran (or was first set)
 * @param {string}      recurrence       'daily' | 'weekly' | 'monthly' | 'one_time'
 * @param {string|null} recurrenceConfig JSON string with day/time config
 * @returns {Date|null}                  Next fire time, or null if the series is exhausted
 */
function computeNextRun(scheduledAt, recurrence, recurrenceConfig) {
  const now = new Date();
  const base = toUtc(scheduledAt);

  if (recurrence === 'daily') {
    let candidate = new Date(base.getTime() + 86_400_000);
    while (candidate <= now) {
      candidate = new Date(candidate.getTime() + 86_400_000);
    }
    return candidate;
  }

  if (recurrence === 'weekly') {
    const cfg = _parseJson(recurrenceConfig);
    const isoDays = new Set(
      (cfg.days || []).map(d => DAY_ISO[d]).filter(Boolean)
    );
    if (isoDays.size === 0) return null;

    // Walk day-by-day from tomorrow, up to 14 days
    for (let offset = 1; offset <= 14; offset++) {
      const candidate = new Date(now);
      candidate.setUTCDate(now.getUTCDate() + offset);
      // getUTCDay(): 0=Sun…6=Sat → convert to ISO 1=Mon…7=Sun
      const isoDay = candidate.getUTCDay() || 7;

      if (isoDays.has(isoDay)) {
        const result = new Date(Date.UTC(
          candidate.getUTCFullYear(),
          candidate.getUTCMonth(),
          candidate.getUTCDate(),
          base.getUTCHours(),
          base.getUTCMinutes(),
          0
        ));
        if (result > now) return result;
      }
    }
    return null;
  }

  if (recurrence === 'monthly') {
    const cfg = _parseJson(recurrenceConfig);
    const targetDay = cfg.day || base.getUTCDate();

    let year = now.getUTCFullYear();
    let month = now.getUTCMonth(); // 0-indexed

    for (let attempt = 0; attempt < 3; attempt++) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }

      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(targetDay, daysInMonth);
      const candidate = new Date(Date.UTC(year, month, day, base.getUTCHours(), base.getUTCMinutes(), 0));

      if (candidate > now) return candidate;
    }
    return null;
  }

  // 'one_time' or unknown — no next run
  return null;
}

function _parseJson(str) {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}

module.exports = { computeNextRun, toUtc };
