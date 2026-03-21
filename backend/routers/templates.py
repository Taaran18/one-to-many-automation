from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


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
    return db.query(models.Template).filter(
        models.Template.user_id == current_user.id
    ).all()


@router.get("/{template_id}", response_model=schemas.TemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id,
    ).first()
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
    t = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id,
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in update.model_dump(exclude_unset=True).items():
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
    t = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id,
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"success": True}
