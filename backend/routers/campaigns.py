from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

BRIDGE_URL = "http://localhost:3001"


def _resolve_template(body: str, lead: models.Lead) -> str:
    return (
        body.replace("{{name}}", lead.name or "")
        .replace("{{phone}}", lead.phone_no or "")
        .replace("{{email}}", lead.email or "")
        .replace("{{tags}}", lead.tags or "")
    )


def _run_campaign(campaign_id: int, user_id: int):
    from database import SessionLocal

    db = SessionLocal()
    try:
        campaign = (
            db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        )
        if not campaign:
            return

        campaign.status = "running"
        db.commit()

        leads = campaign.lead_group.members if campaign.lead_group else []
        template_body = campaign.template.body if campaign.template else ""

        for lead in leads:
            message = _resolve_template(template_body, lead)
            phone = lead.phone_no.lstrip("+").replace(" ", "")
            status = "failed"
            error = None
            try:
                resp = httpx.post(
                    f"{BRIDGE_URL}/message/send",
                    json={
                        "user_id": user_id,
                        "phone_no": f"{phone}@c.us",
                        "message": message,
                    },
                    timeout=30,
                )
                if resp.status_code == 200 and resp.json().get("success"):
                    status = "sent"
            except Exception as e:
                error = str(e)

            log = models.MessageLog(
                campaign_id=campaign_id,
                lead_id=lead.id,
                status=status,
                error_message=error,
            )
            db.add(log)
            db.commit()

        campaign.status = "completed"
        db.commit()
    except Exception as e:
        try:
            campaign = (
                db.query(models.Campaign)
                .filter(models.Campaign.id == campaign_id)
                .first()
            )
            if campaign:
                campaign.status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/", response_model=schemas.CampaignResponse)
def create_campaign(
    campaign: schemas.CampaignCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_campaign = models.Campaign(
        user_id=current_user.id,
        name=campaign.name,
        template_id=campaign.template_id,
        lead_group_id=campaign.lead_group_id,
        scheduled_at=campaign.scheduled_at,
        status="draft" if not campaign.scheduled_at else "scheduled",
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return _build_response(db_campaign, db)


@router.get("/", response_model=List[schemas.CampaignResponse])
def list_campaigns(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Campaign).filter(models.Campaign.user_id == current_user.id)
    if status:
        query = query.filter(models.Campaign.status == status)
    campaigns = query.order_by(models.Campaign.created_at.desc()).all()
    return [_build_response(c, db) for c in campaigns]


@router.get("/{campaign_id}", response_model=schemas.CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Campaign)
        .filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _build_response(c, db)


@router.put("/{campaign_id}", response_model=schemas.CampaignResponse)
def update_campaign(
    campaign_id: int,
    update: schemas.CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Campaign)
        .filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=400, detail="Cannot edit a running or completed campaign"
        )
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    if c.scheduled_at and c.status == "draft":
        c.status = "scheduled"
    db.commit()
    db.refresh(c)
    return _build_response(c, db)


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Campaign)
        .filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(c)
    db.commit()
    return {"success": True}


@router.post("/{campaign_id}/start")
def start_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Campaign)
        .filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.status == "running":
        raise HTTPException(status_code=400, detail="Campaign is already running")
    if c.status == "completed":
        raise HTTPException(status_code=400, detail="Campaign already completed")

    background_tasks.add_task(_run_campaign, campaign_id, current_user.id)
    return {"success": True, "message": "Campaign started"}


@router.get("/{campaign_id}/logs", response_model=List[schemas.MessageLogResponse])
def get_logs(
    campaign_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    c = (
        db.query(models.Campaign)
        .filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    offset = (page - 1) * limit
    logs = (
        db.query(models.MessageLog)
        .filter(models.MessageLog.campaign_id == campaign_id)
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        result.append(
            schemas.MessageLogResponse(
                id=log.id,
                campaign_id=log.campaign_id,
                lead_id=log.lead_id,
                status=log.status,
                sent_at=log.sent_at,
                error_message=log.error_message,
                lead_name=log.lead.name if log.lead else None,
                lead_phone=log.lead.phone_no if log.lead else None,
            )
        )
    return result


def _build_response(c: models.Campaign, db: Session) -> schemas.CampaignResponse:
    from sqlalchemy import func

    sent = (
        db.query(func.count(models.MessageLog.id))
        .filter(
            models.MessageLog.campaign_id == c.id,
            models.MessageLog.status == "sent",
        )
        .scalar()
        or 0
    )
    failed = (
        db.query(func.count(models.MessageLog.id))
        .filter(
            models.MessageLog.campaign_id == c.id,
            models.MessageLog.status == "failed",
        )
        .scalar()
        or 0
    )
    return schemas.CampaignResponse(
        id=c.id,
        user_id=c.user_id,
        name=c.name,
        template_id=c.template_id,
        lead_group_id=c.lead_group_id,
        status=c.status,
        scheduled_at=c.scheduled_at,
        created_at=c.created_at,
        template_name=c.template.name if c.template else None,
        lead_group_name=c.lead_group.name if c.lead_group else None,
        messages_sent=sent,
        messages_failed=failed,
    )
