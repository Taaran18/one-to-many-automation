from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/", response_model=schemas.LeadResponse)
def create_lead(
    lead: schemas.LeadCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_lead = models.Lead(
        user_id=current_user.id,
        name=lead.name,
        phone_no=lead.phone_no,
        email=lead.email,
        tags=lead.tags,
        status=lead.status or "prospect",
    )
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead


@router.get("/", response_model=List[schemas.LeadResponse])
def list_leads(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Lead).filter(models.Lead.user_id == current_user.id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            models.Lead.name.ilike(like)
            | models.Lead.phone_no.ilike(like)
            | models.Lead.email.ilike(like)
        )
    if status:
        query = query.filter(models.Lead.status == status)
    offset = (page - 1) * limit
    return query.offset(offset).limit(limit).all()


@router.get("/{lead_id}", response_model=schemas.LeadResponse)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = (
        db.query(models.Lead)
        .filter(
            models.Lead.id == lead_id,
            models.Lead.user_id == current_user.id,
        )
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=schemas.LeadResponse)
def update_lead(
    lead_id: int,
    update: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = (
        db.query(models.Lead)
        .filter(
            models.Lead.id == lead_id,
            models.Lead.user_id == current_user.id,
        )
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = (
        db.query(models.Lead)
        .filter(
            models.Lead.id == lead_id,
            models.Lead.user_id == current_user.id,
        )
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Clear group memberships before deleting to avoid FK violation
    lead.groups.clear()
    db.flush()
    db.delete(lead)
    db.commit()
    return {"success": True}


@router.post("/import", response_model=List[schemas.LeadResponse])
def import_leads(
    leads: List[schemas.LeadImportItem],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    created = []
    for item in leads:
        db_lead = models.Lead(
            user_id=current_user.id,
            name=item.name,
            phone_no=item.phone_no,
            email=item.email,
            tags=item.tags,
            status=item.status or "prospect",
        )
        db.add(db_lead)
        created.append(db_lead)
    db.commit()
    for lead in created:
        db.refresh(lead)
    return created


# ─── Lead Groups ──────────────────────────────────────────────────────────────


@router.get("/groups/all", response_model=List[schemas.LeadGroupResponse])
def list_groups(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    groups = (
        db.query(models.LeadGroup)
        .filter(models.LeadGroup.user_id == current_user.id)
        .all()
    )
    result = []
    for g in groups:
        result.append(
            schemas.LeadGroupResponse(
                id=g.id,
                user_id=g.user_id,
                name=g.name,
                description=g.description,
                created_at=g.created_at,
                member_count=len(g.members),
            )
        )
    return result


@router.post("/groups", response_model=schemas.LeadGroupResponse)
def create_group(
    group: schemas.LeadGroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_group = models.LeadGroup(
        user_id=current_user.id,
        name=group.name,
        description=group.description,
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return schemas.LeadGroupResponse(
        id=db_group.id,
        user_id=db_group.user_id,
        name=db_group.name,
        description=db_group.description,
        created_at=db_group.created_at,
        member_count=0,
    )


@router.post("/groups/{group_id}/members")
def add_members(
    group_id: int,
    body: schemas.AddMembersRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = (
        db.query(models.LeadGroup)
        .filter(
            models.LeadGroup.id == group_id,
            models.LeadGroup.user_id == current_user.id,
        )
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    leads = (
        db.query(models.Lead)
        .filter(
            models.Lead.id.in_(body.lead_ids),
            models.Lead.user_id == current_user.id,
        )
        .all()
    )

    for lead in leads:
        if lead not in group.members:
            group.members.append(lead)
    db.commit()
    return {"success": True, "added": len(leads)}


@router.get("/{lead_id}/groups")
def get_lead_groups(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = (
        db.query(models.Lead)
        .filter(models.Lead.id == lead_id, models.Lead.user_id == current_user.id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"group_ids": [g.id for g in lead.groups]}


@router.put("/groups/{group_id}", response_model=schemas.LeadGroupResponse)
def update_group(
    group_id: int,
    update: schemas.LeadGroupUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = (
        db.query(models.LeadGroup)
        .filter(
            models.LeadGroup.id == group_id,
            models.LeadGroup.user_id == current_user.id,
        )
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return schemas.LeadGroupResponse(
        id=group.id,
        user_id=group.user_id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        member_count=len(group.members),
    )


@router.delete("/groups/{group_id}/members")
def remove_members(
    group_id: int,
    body: schemas.AddMembersRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = (
        db.query(models.LeadGroup)
        .filter(
            models.LeadGroup.id == group_id,
            models.LeadGroup.user_id == current_user.id,
        )
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group.members = [m for m in group.members if m.id not in body.lead_ids]
    db.commit()
    return {"success": True}


@router.delete("/groups/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = (
        db.query(models.LeadGroup)
        .filter(
            models.LeadGroup.id == group_id,
            models.LeadGroup.user_id == current_user.id,
        )
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()
    return {"success": True}
