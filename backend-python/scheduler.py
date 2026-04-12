"""
Background scheduler: fires scheduled campaigns and reschedules recurring ones.
Runs every 60 seconds inside the FastAPI process.
"""

import json
import threading
import calendar
from datetime import datetime, timezone, timedelta

import models
from database import SessionLocal
from routers.campaigns import _run_campaign


# ── Day name helpers ──────────────────────────────────────────────────────────

# isoweekday(): Mon=1 … Sun=7
_DAY_ISO = {
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
    "sunday": 7,
}


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def compute_next_run(
    scheduled_at: datetime,
    recurrence: str,
    recurrence_config: str | None,
) -> datetime | None:
    """Return the next UTC datetime this campaign should fire, or None."""
    now = datetime.now(timezone.utc)
    base = _ensure_utc(scheduled_at)

    if recurrence == "daily":
        candidate = base + timedelta(days=1)
        while candidate <= now:
            candidate += timedelta(days=1)
        return candidate

    elif recurrence == "weekly":
        cfg = {}
        if recurrence_config:
            try:
                cfg = json.loads(recurrence_config)
            except Exception:
                pass
        iso_days = {_DAY_ISO[d] for d in cfg.get("days", []) if d in _DAY_ISO}
        if not iso_days:
            return None

        # Walk day by day from tomorrow until we hit a matching weekday
        candidate_date = (now + timedelta(days=1)).date()
        for _ in range(14):
            if candidate_date.isoweekday() in iso_days:
                candidate = datetime(
                    candidate_date.year,
                    candidate_date.month,
                    candidate_date.day,
                    base.hour,
                    base.minute,
                    0,
                    tzinfo=timezone.utc,
                )
                if candidate > now:
                    return candidate
            candidate_date += timedelta(days=1)
        return None

    elif recurrence == "monthly":
        cfg = {}
        if recurrence_config:
            try:
                cfg = json.loads(recurrence_config)
            except Exception:
                pass
        target_day = cfg.get("day", base.day)

        # Try next month, then the month after if day doesn't exist
        year, month = now.year, now.month
        for _ in range(3):
            month += 1
            if month > 12:
                month = 1
                year += 1
            max_day = calendar.monthrange(year, month)[1]
            actual_day = min(target_day, max_day)
            candidate = datetime(year, month, actual_day, base.hour, base.minute, 0, tzinfo=timezone.utc)
            if candidate > now:
                return candidate
        return None

    return None


# ── Core scheduler job ────────────────────────────────────────────────────────

def _run_and_reschedule(
    campaign_id: int,
    user_id: int,
    recurrence: str,
    recurrence_config: str | None,
    scheduled_at: datetime,
    stop_at: datetime | None,
):
    """Run the campaign, then reschedule it if recurring."""
    _run_campaign(campaign_id, user_id)

    if not recurrence or recurrence == "one_time":
        return

    db = SessionLocal()
    try:
        campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        if not campaign:
            print(f"[scheduler] Campaign {campaign_id} not found after run — skipping reschedule")
            return

        next_run = compute_next_run(scheduled_at, recurrence, recurrence_config)

        # Check stop_at
        if stop_at:
            stop_at_utc = _ensure_utc(stop_at)
            if next_run is None or next_run > stop_at_utc:
                print(f"[scheduler] Campaign {campaign_id} reached stop_at — setting to draft")
                campaign.status = "draft"
                db.commit()
                return

        if next_run:
            print(f"[scheduler] Campaign {campaign_id} rescheduled for {next_run.isoformat()}")
            campaign.scheduled_at = next_run
            campaign.status = "scheduled"
            db.commit()
        else:
            print(f"[scheduler] Campaign {campaign_id} has no next run — setting to draft")
            campaign.status = "draft"
            db.commit()
    except Exception as e:
        print(f"[scheduler] Error rescheduling campaign {campaign_id}: {e}")
    finally:
        db.close()


def check_scheduled_campaigns():
    """Called every minute by APScheduler. Fires any campaigns that are due."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due = (
            db.query(models.Campaign)
            .filter(
                models.Campaign.status == "scheduled",
                models.Campaign.scheduled_at.isnot(None),
                models.Campaign.scheduled_at <= now,
            )
            .all()
        )

        for campaign in due:
            # Mark running immediately so we don't pick it up again next tick
            campaign.status = "running"
            db.commit()

            t = threading.Thread(
                target=_run_and_reschedule,
                args=(
                    campaign.id,
                    campaign.user_id,
                    campaign.recurrence or "one_time",
                    campaign.recurrence_config,
                    campaign.scheduled_at,
                    campaign.stop_at,
                ),
                daemon=True,
            )
            t.start()

    except Exception as e:
        print(f"[scheduler] Error checking campaigns: {e}")
    finally:
        db.close()
