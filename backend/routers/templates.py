from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import httpx

import models
import schemas
from auth import cipher_suite
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])

META_API_BASE = "https://graph.facebook.com/v19.0"


def _get_meta_creds(user_id: int, db: Session):
    session = (
        db.query(models.WhatsAppSession)
        .filter(
            models.WhatsAppSession.user_id == user_id,
            models.WhatsAppSession.wa_type == "meta",
        )
        .first()
    )
    if not session or not session.meta_access_token:
        raise HTTPException(
            status_code=400,
            detail="No active Meta Business API connection. Connect via Meta first.",
        )

    token = cipher_suite.decrypt(session.meta_access_token.encode("utf-8")).decode(
        "utf-8"
    )

    # If WABA ID is missing, try to fetch it on the fly from the phone ID
    if not session.meta_waba_id and session.meta_phone_id:
        try:
            resp = httpx.get(
                f"{META_API_BASE}/{session.meta_phone_id}",
                params={"fields": "whatsapp_business_account", "access_token": token},
                timeout=10,
            )
            if resp.status_code == 200:
                waba_id = resp.json().get("whatsapp_business_account", {}).get("id")
                if waba_id:
                    session.meta_waba_id = waba_id
                    db.commit()
        except Exception:
            pass

    if not session.meta_waba_id:
        raise HTTPException(
            status_code=400,
            detail="Could not determine WhatsApp Business Account ID. Please disconnect and reconnect via Meta API.",
        )

    return session.meta_waba_id, token


# QR Templates


@router.post("/", response_model=schemas.TemplateResponse)
def create_template(
    template: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_template = models.Template(
        user_id=current_user.id,
        name=template.name,
        body=template.body,
        tags=template.tags,
        connection_type="qr",
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.get("/", response_model=List[schemas.TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Template)
        .filter(models.Template.user_id == current_user.id)
        .order_by(models.Template.created_at.desc())
        .all()
    )


@router.get("/{template_id}", response_model=schemas.TemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = (
        db.query(models.Template)
        .filter(
            models.Template.id == template_id,
            models.Template.user_id == current_user.id,
        )
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


@router.put("/{template_id}", response_model=schemas.TemplateResponse)
def update_template(
    template_id: int,
    update: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = (
        db.query(models.Template)
        .filter(
            models.Template.id == template_id,
            models.Template.user_id == current_user.id,
        )
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    data = update.model_dump(exclude_unset=True)
    if t.connection_type == "meta":
        data = {k: v for k, v in data.items() if k in ("name", "tags", "body", "meta_variable_map")}
    for field, value in data.items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = (
        db.query(models.Template)
        .filter(
            models.Template.id == template_id,
            models.Template.user_id == current_user.id,
        )
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for campaign in t.campaigns:
        campaign.template_id = None
    db.flush()
    db.delete(t)
    db.commit()
    return {"success": True}


# Meta Templates


@router.post("/meta/sync", response_model=List[schemas.TemplateResponse])
def sync_meta_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch all templates from Meta Business API and upsert into local DB."""
    waba_id, token = _get_meta_creds(current_user.id, db)

    try:
        resp = httpx.get(
            f"{META_API_BASE}/{waba_id}/message_templates",
            params={
                "access_token": token,
                "fields": "name,status,category,language,components",
                "limit": 200,
            },
            timeout=15,
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Could not reach Meta Graph API.")

    if resp.status_code != 200:
        detail = resp.json().get("error", {}).get("message", "Meta API error.")
        raise HTTPException(status_code=400, detail=detail)

    meta_templates = resp.json().get("data", [])

    for mt in meta_templates:
        meta_name = mt.get("name", "")
        body_text = ""
        for comp in mt.get("components", []):
            if comp.get("type") == "BODY":
                body_text = comp.get("text", "")
                break

        # Upsert: find by meta_template_name for this user
        existing = (
            db.query(models.Template)
            .filter(
                models.Template.user_id == current_user.id,
                models.Template.meta_template_name == meta_name,
            )
            .first()
        )
        if existing:
            existing.meta_status = mt.get("status")
            existing.meta_category = mt.get("category")
            existing.meta_language = mt.get("language")
            existing.body = body_text
        else:
            db.add(
                models.Template(
                    user_id=current_user.id,
                    name=meta_name.replace("_", " ").title(),
                    body=body_text,
                    connection_type="meta",
                    meta_template_name=meta_name,
                    meta_category=mt.get("category"),
                    meta_status=mt.get("status"),
                    meta_language=mt.get("language"),
                )
            )

    db.commit()
    return (
        db.query(models.Template)
        .filter(
            models.Template.user_id == current_user.id,
            models.Template.connection_type == "meta",
        )
        .order_by(models.Template.created_at.desc())
        .all()
    )


@router.post("/meta", response_model=schemas.TemplateResponse)
def create_meta_template(
    body: schemas.TemplateMetaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Submit a new template to Meta for approval and save locally."""
    waba_id, token = _get_meta_creds(current_user.id, db)
    components = []

    if body.header_image_url:
        components.append({"type": "HEADER", "format": "IMAGE"})
    elif body.header:
        components.append({"type": "HEADER", "format": "TEXT", "text": body.header})

    body_component: dict = {"type": "BODY", "text": body.body}
    if body.variable_samples:
        body_component["example"] = {"body_text": [body.variable_samples]}
    components.append(body_component)

    if body.footer:
        components.append({"type": "FOOTER", "text": body.footer})

    if body.buttons:
        btn_list = []
        for b in body.buttons:
            btn: dict = {"type": b.type, "text": b.text}
            if b.type == "URL" and b.url:
                btn["url"] = b.url
            elif b.type == "PHONE_NUMBER" and b.phone_number:
                btn["phone_number"] = b.phone_number
            btn_list.append(btn)
        components.append({"type": "BUTTONS", "buttons": btn_list})

    payload = {
        "name": body.meta_template_name,
        "category": body.category,
        "language": body.language,
        "components": components,
    }

    try:
        resp = httpx.post(
            f"{META_API_BASE}/{waba_id}/message_templates",
            params={"access_token": token},
            json=payload,
            timeout=15,
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Could not reach Meta Graph API.")

    if resp.status_code not in (200, 201):
        detail = resp.json().get("error", {}).get("message", "Meta API error.")
        raise HTTPException(status_code=400, detail=detail)

    meta_status = resp.json().get("status", "PENDING")

    db_template = models.Template(
        user_id=current_user.id,
        name=body.name,
        body=body.body,
        connection_type="meta",
        meta_template_name=body.meta_template_name,
        meta_category=body.category,
        meta_status=meta_status,
        meta_header_image_url=body.header_image_url or None,
        meta_language=body.language,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.post("/meta/{template_id}/refresh", response_model=schemas.TemplateResponse)
def refresh_meta_template_status(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Refresh the approval status of a single Meta template."""
    waba_id, token = _get_meta_creds(current_user.id, db)
    t = (
        db.query(models.Template)
        .filter(
            models.Template.id == template_id,
            models.Template.user_id == current_user.id,
            models.Template.connection_type == "meta",
        )
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        resp = httpx.get(
            f"{META_API_BASE}/{waba_id}/message_templates",
            params={
                "name": t.meta_template_name,
                "access_token": token,
                "fields": "name,status,category",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data:
                t.meta_status = data[0].get("status", t.meta_status)
                db.commit()
                db.refresh(t)
    except Exception:
        pass

    return t
