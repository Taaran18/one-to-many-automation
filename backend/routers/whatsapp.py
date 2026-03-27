from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import httpx

import models
import schemas
from auth import cipher_suite
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

BRIDGE_URL = "http://localhost:3001"
META_API_BASE = "https://graph.facebook.com/v19.0"


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


def _encrypt(value: str) -> str:
    return cipher_suite.encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt(value: str) -> str:
    return cipher_suite.decrypt(value.encode("utf-8")).decode("utf-8")


@router.get("/status", response_model=schemas.WAStatusResponse)
def get_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_or_create_session(current_user.id, db)

    if session.wa_type == "meta":
        return schemas.WAStatusResponse(
            status=session.status,
            user_email=current_user.email or current_user.phone_no,
            wa_type="meta",
        )

    # QR / bridge path
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
        wa_type="qr",
    )


@router.post("/connect", response_model=schemas.WAStatusResponse)
def connect_qr(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_or_create_session(current_user.id, db)

    # Clear any existing Meta credentials when switching to QR
    session.wa_type = "qr"
    session.meta_phone_id = None
    session.meta_access_token = None
    db.commit()

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
        wa_type="qr",
    )


@router.post("/connect/meta", response_model=schemas.WAStatusResponse)
def connect_meta(
    body: schemas.WAMetaConnectRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Validate credentials against Meta Graph API
    try:
        resp = httpx.get(
            f"{META_API_BASE}/{body.phone_id}",
            params={
                "fields": "display_phone_number,verified_name",
                "access_token": body.access_token,
            },
            timeout=10,
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Could not reach Meta Graph API.")

    if resp.status_code != 200:
        detail = resp.json().get("error", {}).get("message", "Invalid credentials.")
        raise HTTPException(status_code=400, detail=detail)

    waba_id = body.waba_id.strip()

    # Destroy any existing QR bridge session
    session = _get_or_create_session(current_user.id, db)
    if session.wa_type == "qr":
        try:
            httpx.post(
                f"{BRIDGE_URL}/session/destroy",
                json={"user_id": current_user.id},
                timeout=5,
            )
        except Exception:
            pass

    session.wa_type = "meta"
    session.meta_phone_id = body.phone_id
    session.meta_access_token = _encrypt(body.access_token)
    session.meta_waba_id = waba_id
    session.status = "connected"
    session.last_seen = datetime.now(timezone.utc)
    db.commit()

    return schemas.WAStatusResponse(
        status="connected",
        user_email=current_user.email or current_user.phone_no,
        wa_type="meta",
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
    session = _get_or_create_session(current_user.id, db)

    if session.wa_type == "meta" and session.meta_phone_id and session.meta_access_token:
        try:
            token = _decrypt(session.meta_access_token)
            resp = httpx.get(
                f"{META_API_BASE}/{session.meta_phone_id}",
                params={
                    "fields": "display_phone_number,verified_name",
                    "access_token": token,
                },
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return schemas.WAInfoResponse(
                    name=data.get("verified_name"),
                    phone=data.get("display_phone_number"),
                    connected_at=session.last_seen.isoformat() if session.last_seen else None,
                    wa_type="meta",
                )
        except Exception:
            pass
        return schemas.WAInfoResponse(wa_type="meta")

    # QR bridge path
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
                wa_type="qr",
            )
    except Exception:
        pass
    return schemas.WAInfoResponse(wa_type="qr")


@router.post("/disconnect")
def disconnect(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_or_create_session(current_user.id, db)

    if session.wa_type == "qr":
        try:
            httpx.post(
                f"{BRIDGE_URL}/session/destroy",
                json={"user_id": current_user.id},
                timeout=10,
            )
        except Exception:
            pass

    session.status = "disconnected"
    session.wa_type = "qr"
    session.meta_phone_id = None
    session.meta_access_token = None
    db.commit()
    return {"success": True}
