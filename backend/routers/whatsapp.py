from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import httpx

import models
import schemas
from database import get_db
from dependencies import get_current_user

import os

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

BRIDGE_URL = os.getenv("BRIDGE_URL", "http://localhost:3001")


def _get_or_create_session(user_id: int, db: Session) -> models.WhatsAppSession:
    session = (
        db.query(models.WhatsAppSession)
        .filter(models.WhatsAppSession.user_id == user_id)
        .first()
    )
    if not session:
        session = models.WhatsAppSession(user_id=user_id, status="disconnected")
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


@router.get("/status", response_model=schemas.WAStatusResponse)
def get_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_or_create_session(current_user.id, db)

    # Try to sync with bridge
    try:
        resp = httpx.get(
            f"{BRIDGE_URL}/session/status",
            params={"user_id": current_user.id},
            timeout=5,
        )
        if resp.status_code == 200:
            bridge_status = resp.json().get("status", "disconnected")
            session.status = bridge_status
            session.last_seen = datetime.now(timezone.utc)
            db.commit()
    except Exception:
        pass  # Bridge not running; return last known status

    return schemas.WAStatusResponse(
        status=session.status,
        user_email=current_user.email or current_user.phone_no,
    )


@router.post("/connect", response_model=schemas.WAStatusResponse)
def connect(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_or_create_session(current_user.id, db)
    try:
        resp = httpx.post(
            f"{BRIDGE_URL}/session/create",
            json={"user_id": current_user.id},
            timeout=10,
        )
        if resp.status_code == 200:
            session.status = "qr_pending"
            db.commit()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp bridge is not running. Start the whatsapp-bridge service.",
        )
    return schemas.WAStatusResponse(
        status=session.status,
        user_email=current_user.email or current_user.phone_no,
    )


@router.get("/qr", response_model=schemas.WAQRResponse)
def get_qr(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        resp = httpx.get(
            f"{BRIDGE_URL}/session/qr",
            params={"user_id": current_user.id},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "connected":
                session = _get_or_create_session(current_user.id, db)
                session.status = "connected"
                db.commit()
                return schemas.WAQRResponse(status="connected")
            return schemas.WAQRResponse(qr=data.get("qr"), status="qr_pending")
    except Exception:
        raise HTTPException(status_code=503, detail="WhatsApp bridge is not running.")
    return schemas.WAQRResponse(status="qr_pending")


@router.get("/info", response_model=schemas.WAInfoResponse)
def get_info(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        resp = httpx.get(
            f"{BRIDGE_URL}/session/info",
            params={"user_id": current_user.id},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            return schemas.WAInfoResponse(
                name=data.get("name"),
                phone=data.get("phone"),
                connected_at=data.get("connected_at"),
            )
    except Exception:
        pass
    return schemas.WAInfoResponse()


@router.post("/disconnect")
def disconnect(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_or_create_session(current_user.id, db)
    try:
        httpx.post(
            f"{BRIDGE_URL}/session/destroy",
            json={"user_id": current_user.id},
            timeout=10,
        )
    except Exception:
        pass
    session.status = "disconnected"
    db.commit()
    return {"success": True}
