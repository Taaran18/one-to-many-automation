"""
Chats router — WhatsApp-like inbox.

Endpoints:
  GET  /chats/contacts              – All leads with any message history (sorted by recency)
  GET  /chats/messages/{phone}      – Full thread for a phone number
  POST /chats/send                  – Send a freeform message from the inbox
  POST /chats/webhook/incoming      – Called by WA bridge (QR) when a message is received
  GET  /chats/webhook/meta          – Meta webhook subscription verification
  POST /chats/webhook/meta          – Meta webhook incoming message handler
  POST /chats/read/{phone}          – Mark all messages from phone as read
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime, timezone
from typing import List
import hmac
import hashlib
import httpx
import os
import json

import models
import schemas
from auth import cipher_suite
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/chats", tags=["chats"])

BRIDGE_URL = os.getenv("BRIDGE_URL", "http://localhost:3001")
META_API_BASE = "https://graph.facebook.com/v19.0"
META_WEBHOOK_VERIFY_TOKEN = os.getenv("META_WEBHOOK_VERIFY_TOKEN", "")
META_WEBHOOK_SECRET = os.getenv("META_WEBHOOK_SECRET", "")


def _decrypt(value: str) -> str:
    return cipher_suite.decrypt(value.encode("utf-8")).decode("utf-8")


def _normalize_phone(phone: str) -> str:
    """Strip leading + and spaces for consistent storage / lookup."""
    return phone.lstrip("+").replace(" ", "").replace("-", "")


@router.get("/contacts", response_model=List[schemas.ChatContact])
def get_contacts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return all leads (belonging to this user) that have at least one outbound
    or inbound message, ordered by the most recent message time.
    """
    # Gather all phone numbers that have outbound messages (via campaigns)
    outbound_rows = (
        db.query(
            models.Lead.phone_no,
            func.max(models.MessageLog.sent_at).label("last_at"),
        )
        .join(models.MessageLog, models.MessageLog.lead_id == models.Lead.id)
        .filter(models.Lead.user_id == current_user.id)
        .group_by(models.Lead.phone_no)
        .all()
    )

    # Gather all phones that have inbound messages
    inbound_rows = (
        db.query(
            models.IncomingMessage.phone_no,
            func.max(models.IncomingMessage.received_at).label("last_at"),
        )
        .filter(models.IncomingMessage.user_id == current_user.id)
        .group_by(models.IncomingMessage.phone_no)
        .all()
    )

    # Merge and deduplicate by phone — keep the most recent timestamp
    phone_time: dict[str, datetime] = {}
    for row in outbound_rows:
        phone_time[row.phone_no] = row.last_at
    for row in inbound_rows:
        existing = phone_time.get(row.phone_no)
        if existing is None or (row.last_at and row.last_at > existing):
            phone_time[row.phone_no] = row.last_at

    if not phone_time:
        return []

    # Sort by most recent message
    sorted_phones = sorted(
        phone_time.items(), key=lambda x: x[1] or datetime.min, reverse=True
    )

    contacts: List[schemas.ChatContact] = []
    for phone_no, _ in sorted_phones:
        # Try to find the lead record for this user + phone
        lead = (
            db.query(models.Lead)
            .filter(
                models.Lead.user_id == current_user.id,
                models.Lead.phone_no == phone_no,
            )
            .first()
        )

        # Last outbound message
        last_out = (
            db.query(models.MessageLog)
            .join(models.Lead, models.MessageLog.lead_id == models.Lead.id)
            .filter(
                models.Lead.user_id == current_user.id,
                models.Lead.phone_no == phone_no,
            )
            .order_by(models.MessageLog.sent_at.desc())
            .first()
        )

        # Last inbound message
        last_in = (
            db.query(models.IncomingMessage)
            .filter(
                models.IncomingMessage.user_id == current_user.id,
                models.IncomingMessage.phone_no == phone_no,
            )
            .order_by(models.IncomingMessage.received_at.desc())
            .first()
        )

        # Pick the more recent of the two as the "last message"
        last_body = None
        last_ts = None
        if last_out and last_in:
            if (last_in.received_at or datetime.min) > (last_out.sent_at or datetime.min):
                last_body = last_in.body
                last_ts = last_in.received_at
            else:
                last_body = last_out.body_text or (
                    last_out.campaign.template.body[:80] if last_out.campaign and last_out.campaign.template else "📎 Message"
                )
                last_ts = last_out.sent_at
        elif last_out:
            last_body = last_out.body_text or (
                last_out.campaign.template.body[:80] if last_out.campaign and last_out.campaign.template else "📎 Message"
            )
            last_ts = last_out.sent_at
        elif last_in:
            last_body = last_in.body
            last_ts = last_in.received_at

        # Unread count — exclude our own OUTBOUND_DIRECT messages
        unread = (
            db.query(func.count(models.IncomingMessage.id))
            .filter(
                models.IncomingMessage.user_id == current_user.id,
                models.IncomingMessage.phone_no == phone_no,
                models.IncomingMessage.is_read.is_(False),
                models.IncomingMessage.wa_message_id != "OUTBOUND_DIRECT",
            )
            .scalar()
            or 0
        )

        contacts.append(
            schemas.ChatContact(
                lead_id=lead.id if lead else None,
                name=lead.name if lead else phone_no,
                phone_no=phone_no,
                last_message=last_body,
                last_message_at=last_ts,
                unread_count=unread,
            )
        )

    return contacts


@router.get("/messages/{phone_no:path}", response_model=List[schemas.ChatMessage])
def get_messages(
    phone_no: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the full chat thread for a given phone number (both directions)."""
    # Find corresponding lead for this user
    lead = (
        db.query(models.Lead)
        .filter(
            models.Lead.user_id == current_user.id,
            models.Lead.phone_no == phone_no,
        )
        .first()
    )

    messages: List[schemas.ChatMessage] = []

    # — Outbound (sent via campaigns) —
    if lead:
        logs = (
            db.query(models.MessageLog)
            .filter(models.MessageLog.lead_id == lead.id)
            .order_by(models.MessageLog.sent_at.asc())
            .all()
        )
        for log in logs:
            body = log.body_text
            if not body:
                # Fallback: use template body (unresolved)
                if log.campaign and log.campaign.template:
                    body = log.campaign.template.body
                else:
                    body = "📎 Campaign message"
            campaign_name = None
            if log.campaign:
                campaign_name = log.campaign.name
            messages.append(
                schemas.ChatMessage(
                    id=log.id * 10,  # namespace to avoid collision with inbound
                    direction="outbound",
                    body=body,
                    timestamp=log.sent_at,
                    status=log.status,
                    campaign_id=log.campaign_id,
                    campaign_name=campaign_name,
                    is_read=True,
                )
            )

    # — Inbound (replies from lead) —
    inbound = (
        db.query(models.IncomingMessage)
        .filter(
            models.IncomingMessage.user_id == current_user.id,
            models.IncomingMessage.phone_no == phone_no,
        )
        .order_by(models.IncomingMessage.received_at.asc())
        .all()
    )
    for msg in inbound:
        messages.append(
            schemas.ChatMessage(
                id=msg.id * 10 + 1,  # namespace to avoid collision with outbound
                direction="inbound",
                body=msg.body,
                timestamp=msg.received_at,
                status=None,
                campaign_id=None,
                campaign_name=None,
                is_read=msg.is_read,
            )
        )

    # Sort combined list chronologically
    messages.sort(key=lambda m: m.timestamp or datetime.min)
    return messages


@router.post("/send", response_model=dict)
def send_message(
    payload: schemas.SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send a freeform message to a lead from the inbox."""
    session = (
        db.query(models.WhatsAppSession)
        .filter(models.WhatsAppSession.user_id == current_user.id)
        .first()
    )
    if not session or session.status != "connected":
        raise HTTPException(status_code=400, detail="WhatsApp is not connected.")

    phone = _normalize_phone(payload.phone_no)

    if session.wa_type == "meta" and session.meta_phone_id and session.meta_access_token:
        token = _decrypt(session.meta_access_token)
        resp = httpx.post(
            f"{META_API_BASE}/{session.meta_phone_id}/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "text",
                "text": {"body": payload.body},
            },
            timeout=30,
        )
        if resp.status_code != 200 or not resp.json().get("messages"):
            err = resp.json().get("error", {}).get("message", "Meta API error")
            raise HTTPException(status_code=400, detail=err)
    else:
        resp = httpx.post(
            f"{BRIDGE_URL}/message/send",
            json={
                "user_id": current_user.id,
                "phone_no": f"{phone}@c.us",
                "message": payload.body,
            },
            timeout=30,
        )
        if not resp.json().get("success"):
            raise HTTPException(status_code=400, detail=resp.json().get("error", "Send failed"))

    # Store as an outbound "direct" message in IncomingMessage table with a special marker
    # so it shows in the thread (we reuse IncomingMessage with a negative id trick isn't great,
    # so instead we store a MessageLog-less outbound message in a dedicated approach below).
    # For now we store it as a "direct_message_log" linked to a virtual campaign=None.
    # Best approach: find the lead and create a MessageLog with campaign_id pointing to a
    # sentinel or store separately. We'll create a DirectMessage record via IncomingMessage
    # with direction stored in wa_message_id prefix.
    lead = (
        db.query(models.Lead)
        .filter(
            models.Lead.user_id == current_user.id,
            models.Lead.phone_no == payload.phone_no,
        )
        .first()
    )

    # Store direct outbound in a way that can be retrieved. We use a dedicated approach:
    # Persist to IncomingMessage with wa_message_id="OUTBOUND" so the /messages endpoint
    # can pick it up as direction=outbound (no campaign_id).
    direct_msg = models.IncomingMessage(
        user_id=current_user.id,
        phone_no=payload.phone_no,
        body=f"__OUTBOUND__:{payload.body}",  # prefixed so we know direction
        is_read=True,
        wa_message_id="OUTBOUND_DIRECT",
    )
    db.add(direct_msg)
    db.commit()

    return {"success": True}


@router.post("/webhook/incoming")
def incoming_webhook(
    payload: schemas.IncomingWebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Called by the WhatsApp bridge when a message is received from a contact.
    No auth required (internal service call).
    """
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Deduplicate by wa_message_id
    if payload.wa_message_id:
        existing = (
            db.query(models.IncomingMessage)
            .filter(models.IncomingMessage.wa_message_id == payload.wa_message_id)
            .first()
        )
        if existing:
            return {"success": True, "duplicate": True}

    msg = models.IncomingMessage(
        user_id=payload.user_id,
        phone_no=payload.phone_no,
        body=payload.body,
        wa_message_id=payload.wa_message_id,
        is_read=False,
    )
    db.add(msg)
    db.commit()
    return {"success": True}


@router.get("/webhook/meta")
def meta_webhook_verify(request: Request):
    """
    Meta calls this GET endpoint to verify the webhook subscription.
    Responds with hub.challenge when hub.verify_token matches.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge", "")

    if mode == "subscribe" and token and token == META_WEBHOOK_VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook/meta")
async def meta_webhook_incoming(request: Request, db: Session = Depends(get_db)):
    """
    Meta sends incoming WhatsApp messages here.
    Validates X-Hub-Signature-256 (when META_WEBHOOK_SECRET is set),
    finds the user by meta_phone_id, and stores the message.
    """
    raw_body = await request.body()

    # Validate HMAC signature when secret is configured
    if META_WEBHOOK_SECRET:
        sig_header = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(
            META_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Meta always sends object="whatsapp_business_account"
    if payload.get("object") != "whatsapp_business_account":
        return {"success": True}

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "messages":
                continue
            value = change.get("value", {})

            phone_number_id = value.get("metadata", {}).get("phone_number_id")
            if not phone_number_id:
                continue

            # Map phone_number_id → user via their WhatsApp session
            wa_session = (
                db.query(models.WhatsAppSession)
                .filter(models.WhatsAppSession.meta_phone_id == phone_number_id)
                .first()
            )
            if not wa_session:
                continue

            for msg in value.get("messages", []):
                msg_type = msg.get("type", "text")
                from_phone = _normalize_phone(msg.get("from", ""))
                wa_message_id = msg.get("id")

                # Extract body based on message type
                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "")
                elif msg_type == "image":
                    caption = msg.get("image", {}).get("caption", "")
                    body = f"[Image] {caption}".strip() if caption else "[Image]"
                elif msg_type == "audio":
                    body = "[Audio message]"
                elif msg_type == "video":
                    caption = msg.get("video", {}).get("caption", "")
                    body = f"[Video] {caption}".strip() if caption else "[Video]"
                elif msg_type == "document":
                    filename = msg.get("document", {}).get("filename", "")
                    body = f"[Document: {filename}]" if filename else "[Document]"
                elif msg_type == "location":
                    loc = msg.get("location", {})
                    body = f"[Location: {loc.get('latitude')}, {loc.get('longitude')}]"
                elif msg_type == "sticker":
                    body = "[Sticker]"
                else:
                    body = f"[{msg_type}]"

                if not from_phone or not body:
                    continue

                # Deduplicate by wa_message_id
                if wa_message_id:
                    existing = (
                        db.query(models.IncomingMessage)
                        .filter(models.IncomingMessage.wa_message_id == wa_message_id)
                        .first()
                    )
                    if existing:
                        continue

                incoming = models.IncomingMessage(
                    user_id=wa_session.user_id,
                    phone_no=from_phone,
                    body=body,
                    wa_message_id=wa_message_id,
                    is_read=False,
                )
                db.add(incoming)

    db.commit()
    return {"success": True}


@router.post("/read/{phone_no:path}")
def mark_read(
    phone_no: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark all inbound messages from a phone number as read."""
    db.query(models.IncomingMessage).filter(
        models.IncomingMessage.user_id == current_user.id,
        models.IncomingMessage.phone_no == phone_no,
        models.IncomingMessage.is_read.is_(False),
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


@router.get("/unread_count")
def get_total_unread(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return total unread incoming message count for badge display."""
    count = (
        db.query(func.count(models.IncomingMessage.id))
        .filter(
            models.IncomingMessage.user_id == current_user.id,
            models.IncomingMessage.is_read.is_(False),
            models.IncomingMessage.wa_message_id != "OUTBOUND_DIRECT",
        )
        .scalar()
        or 0
    )
    return {"unread_count": count}
