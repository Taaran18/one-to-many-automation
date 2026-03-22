from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Auth Schemas ────────────────────────────────────────────────────────────


class UserBase(BaseModel):
    email: str | None = None
    phone_no: str | None = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# ─── Lead Schemas ─────────────────────────────────────────────────────────────


class LeadCreate(BaseModel):
    name: str
    phone_no: str
    email: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = "prospect"


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone_no: Optional[str] = None
    email: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None


class LeadResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phone_no: str
    email: Optional[str] = None
    tags: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadImportItem(BaseModel):
    name: str
    phone_no: str
    email: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = "prospect"


# ─── Lead Group Schemas ───────────────────────────────────────────────────────


class LeadGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class LeadGroupResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True


class AddMembersRequest(BaseModel):
    lead_ids: List[int]


# ─── Template Schemas ─────────────────────────────────────────────────────────


class TemplateCreate(BaseModel):
    name: str
    body: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    body: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Campaign Schemas ─────────────────────────────────────────────────────────


class CampaignCreate(BaseModel):
    name: str
    template_id: Optional[int] = None
    lead_group_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    template_id: Optional[int] = None
    lead_group_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None


class CampaignResponse(BaseModel):
    id: int
    user_id: int
    name: str
    template_id: Optional[int] = None
    lead_group_id: Optional[int] = None
    status: str
    scheduled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    template_name: Optional[str] = None
    lead_group_name: Optional[str] = None
    messages_sent: Optional[int] = 0
    messages_failed: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Message Log Schemas ──────────────────────────────────────────────────────


class MessageLogResponse(BaseModel):
    id: int
    campaign_id: int
    lead_id: int
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Dashboard Schemas ────────────────────────────────────────────────────────


class DashboardStats(BaseModel):
    total_leads: int
    leads_touched: int
    total_templates: int
    total_campaigns: int
    campaigns_next_7_days: int
    messages_sent_this_month: int
    total_customers: int
    total_prospects: int


class ChartDataPoint(BaseModel):
    date: str
    count: int


class ScheduleItem(BaseModel):
    id: int
    name: str
    status: str
    scheduled_at: Optional[datetime] = None
    lead_group_name: Optional[str] = None
    template_name: Optional[str] = None


# ─── WhatsApp Schemas ─────────────────────────────────────────────────────────


class WAStatusResponse(BaseModel):
    status: str
    user_email: Optional[str] = None


class WAQRResponse(BaseModel):
    qr: Optional[str] = None
    status: str
