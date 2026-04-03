from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import json
import time

import models
import schemas
from auth import cipher_suite
from database import get_db
from dependencies import get_current_user

import os
import re

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

BRIDGE_URL = os.getenv("BRIDGE_URL", "http://localhost:3001")
META_API_BASE = "https://graph.facebook.com/v19.0"


def _resolve_template(body: str, lead: models.Lead) -> str:
    return (
        body.replace("{{name}}", lead.name or "")
        .replace("{{phone}}", lead.phone_no or "")
        .replace("{{email}}", lead.email or "")
        .replace("{{company_name}}", lead.company_name or "")
        .replace("{{city}}", lead.city or "")
        .replace("{{state}}", lead.state or "")
        .replace("{{country}}", lead.country or "")
        .replace("{{pincode}}", lead.pincode or "")
        .replace("{{tags}}", lead.tags or "")
    )


def _meta_body_params(body: str, lead: models.Lead) -> list:
    """Extract {{var}} placeholders in order and return resolved Meta parameters."""
    var_map = {
        "name": lead.name or "",
        "phone": lead.phone_no or "",
        "email": lead.email or "",
        "company_name": lead.company_name or "",
        "city": lead.city or "",
        "state": lead.state or "",
        "country": lead.country or "",
        "pincode": lead.pincode or "",
        "tags": lead.tags or "",
    }
    seen = set()
    params = []
    for match in re.finditer(r"\{\{(\w+)\}\}", body):
        var = match.group(1)
        if var in var_map and var not in seen:
            seen.add(var)
            params.append({"type": "text", "text": var_map[var]})
    return params


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
        campaign.run_count = (campaign.run_count or 0) + 1
        current_run = campaign.run_count
        db.commit()

        # Collect unique leads from all selected groups
        group_ids = []
        if campaign.lead_group_ids:
            try:
                group_ids = json.loads(campaign.lead_group_ids)
            except Exception:
                pass
        if not group_ids and campaign.lead_group_id:
            group_ids = [campaign.lead_group_id]

        seen_lead_ids = set()
        leads = []
        for gid in group_ids:
            grp = db.query(models.LeadGroup).filter(models.LeadGroup.id == gid).first()
            if grp:
                for lead in grp.members:
                    if lead.id not in seen_lead_ids:
                        seen_lead_ids.add(lead.id)
                        leads.append(lead)

        template_body = campaign.template.body if campaign.template else ""

        # Determine connection type for this user
        wa_session = (
            db.query(models.WhatsAppSession)
            .filter(models.WhatsAppSession.user_id == user_id)
            .first()
        )
        use_meta = (
            wa_session
            and wa_session.wa_type == "meta"
            and wa_session.meta_phone_id
            and wa_session.meta_access_token
        )
        meta_phone_id = None
        meta_token = None
        if use_meta:
            meta_phone_id = wa_session.meta_phone_id
            meta_token = cipher_suite.decrypt(
                wa_session.meta_access_token.encode("utf-8")
            ).decode("utf-8")

        for i, lead in enumerate(leads):
            message = _resolve_template(template_body, lead)
            phone = lead.phone_no.lstrip("+").replace(" ", "")
            status = "failed"
            error = None
            try:
                if use_meta:
                    tmpl = campaign.template
                    meta_tpl_name = tmpl.meta_template_name if tmpl else None
                    meta_lang = (tmpl.meta_language or "en_US") if tmpl else "en_US"

                    if meta_tpl_name:
                        # Send as approved Meta template (works outside 24h window)
                        params = _meta_body_params(template_body, lead)
                        components = (
                            [{"type": "body", "parameters": params}] if params else []
                        )
                        payload = {
                            "messaging_product": "whatsapp",
                            "to": phone,
                            "type": "template",
                            "template": {
                                "name": meta_tpl_name,
                                "language": {"code": meta_lang},
                                "components": components,
                            },
                        }
                    else:
                        # Fallback: plain text (only works within 24h window)
                        payload = {
                            "messaging_product": "whatsapp",
                            "to": phone,
                            "type": "text",
                            "text": {"body": message},
                        }

                    resp = httpx.post(
                        f"{META_API_BASE}/{meta_phone_id}/messages",
                        headers={
                            "Authorization": f"Bearer {meta_token}",
                            "Content-Type": "application/json",
                        },
                        json=payload,
                        timeout=30,
                    )
                    if resp.status_code == 200 and resp.json().get("messages"):
                        status = "sent"
                    else:
                        error = (
                            resp.json()
                            .get("error", {})
                            .get("message", "Meta API error")
                        )
                else:
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
                run_number=current_run,
            )
            db.add(log)
            db.commit()

            if i < len(leads) - 1:
                time.sleep(2)

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
    primary_group_id = campaign.lead_group_id
    all_group_ids = campaign.lead_group_ids or (
        [campaign.lead_group_id] if campaign.lead_group_id else []
    )
    if not primary_group_id and all_group_ids:
        primary_group_id = all_group_ids[0]

    db_campaign = models.Campaign(
        user_id=current_user.id,
        name=campaign.name,
        template_id=campaign.template_id,
        lead_group_id=primary_group_id,
        lead_group_ids=json.dumps(all_group_ids) if all_group_ids else None,
        scheduled_at=campaign.scheduled_at,
        stop_at=campaign.stop_at,
        recurrence=campaign.recurrence or "one_time",
        recurrence_config=campaign.recurrence_config,
        tags=campaign.tags,
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
    update_data = update.model_dump(exclude_unset=True)
    non_tag_fields = {k: v for k, v in update_data.items() if k != "tags"}
    if non_tag_fields and c.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=400, detail="Cannot edit a running or completed campaign"
        )
    for field, value in update_data.items():
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


@router.post("/{campaign_id}/rerun")
def rerun_campaign(
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
    c.status = "draft"
    db.commit()
    background_tasks.add_task(_run_campaign, campaign_id, current_user.id)
    return {"success": True, "message": "Campaign rerun started"}


@router.post("/{campaign_id}/stop")
def stop_campaign(
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
    c.status = "draft"
    db.commit()
    return {"success": True, "message": "Campaign stopped"}


@router.post("/{campaign_id}/duplicate", response_model=schemas.CampaignResponse)
def duplicate_campaign(
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
    new_c = models.Campaign(
        user_id=current_user.id,
        name=f"{c.name} (Copy)",
        template_id=c.template_id,
        lead_group_id=c.lead_group_id,
        status="draft",
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return _build_response(new_c, db)


@router.get("/{campaign_id}/logs", response_model=List[schemas.MessageLogResponse])
def get_logs(
    campaign_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(200, ge=1, le=1000),
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
                run_number=log.run_number or 1,
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
    # Deserialize multi-group IDs
    group_ids = []
    if c.lead_group_ids:
        try:
            group_ids = json.loads(c.lead_group_ids)
        except Exception:
            pass

    # Fetch names for all selected groups
    group_names = []
    for gid in group_ids:
        grp = db.query(models.LeadGroup).filter(models.LeadGroup.id == gid).first()
        if grp:
            group_names.append(grp.name)

    return schemas.CampaignResponse(
        id=c.id,
        user_id=c.user_id,
        name=c.name,
        template_id=c.template_id,
        lead_group_id=c.lead_group_id,
        lead_group_ids=group_ids or None,
        status=c.status,
        scheduled_at=c.scheduled_at,
        stop_at=c.stop_at,
        created_at=c.created_at,
        recurrence=c.recurrence or "one_time",
        recurrence_config=c.recurrence_config,
        tags=c.tags,
        template_name=c.template.name if c.template else None,
        lead_group_name=c.lead_group.name if c.lead_group else None,
        lead_group_names=group_names or None,
        messages_sent=sent,
        messages_failed=failed,
    )
