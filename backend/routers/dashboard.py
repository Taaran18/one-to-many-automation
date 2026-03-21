from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from typing import List

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    uid = current_user.id
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_end = now + timedelta(days=7)

    total_leads = db.query(func.count(models.Lead.id)).filter(
        models.Lead.user_id == uid
    ).scalar() or 0

    # Leads that have been sent at least one message
    leads_touched = db.query(func.count(func.distinct(models.MessageLog.lead_id))).join(
        models.Campaign, models.MessageLog.campaign_id == models.Campaign.id
    ).filter(
        models.Campaign.user_id == uid,
        models.MessageLog.status == "sent",
    ).scalar() or 0

    total_templates = db.query(func.count(models.Template.id)).filter(
        models.Template.user_id == uid
    ).scalar() or 0

    total_campaigns = db.query(func.count(models.Campaign.id)).filter(
        models.Campaign.user_id == uid
    ).scalar() or 0

    campaigns_next_7_days = db.query(func.count(models.Campaign.id)).filter(
        models.Campaign.user_id == uid,
        models.Campaign.scheduled_at >= now,
        models.Campaign.scheduled_at <= week_end,
    ).scalar() or 0

    messages_sent_this_month = db.query(func.count(models.MessageLog.id)).join(
        models.Campaign, models.MessageLog.campaign_id == models.Campaign.id
    ).filter(
        models.Campaign.user_id == uid,
        models.MessageLog.sent_at >= month_start,
    ).scalar() or 0

    total_customers = db.query(func.count(models.Lead.id)).filter(
        models.Lead.user_id == uid,
        models.Lead.status == "customer",
    ).scalar() or 0

    total_prospects = db.query(func.count(models.Lead.id)).filter(
        models.Lead.user_id == uid,
        models.Lead.status == "prospect",
    ).scalar() or 0

    return schemas.DashboardStats(
        total_leads=total_leads,
        leads_touched=leads_touched,
        total_templates=total_templates,
        total_campaigns=total_campaigns,
        campaigns_next_7_days=campaigns_next_7_days,
        messages_sent_this_month=messages_sent_this_month,
        total_customers=total_customers,
        total_prospects=total_prospects,
    )


@router.get("/schedule", response_model=List[schemas.ScheduleItem])
def get_schedule(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=24)
    campaigns = db.query(models.Campaign).filter(
        models.Campaign.user_id == current_user.id,
        models.Campaign.scheduled_at >= now,
        models.Campaign.scheduled_at <= end,
    ).order_by(models.Campaign.scheduled_at).limit(10).all()

    result = []
    for c in campaigns:
        result.append(schemas.ScheduleItem(
            id=c.id,
            name=c.name,
            status=c.status,
            scheduled_at=c.scheduled_at,
            lead_group_name=c.lead_group.name if c.lead_group else None,
            template_name=c.template.name if c.template else None,
        ))
    return result


@router.get("/chart", response_model=List[schemas.ChartDataPoint])
def get_chart(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=29)

    rows = db.query(
        func.date(models.MessageLog.sent_at).label("date"),
        func.count(models.MessageLog.id).label("count"),
    ).join(
        models.Campaign, models.MessageLog.campaign_id == models.Campaign.id
    ).filter(
        models.Campaign.user_id == current_user.id,
        models.MessageLog.sent_at >= start,
    ).group_by(
        func.date(models.MessageLog.sent_at)
    ).order_by("date").all()

    return [schemas.ChartDataPoint(date=str(r.date), count=r.count) for r in rows]
