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


class LeadGroupUpdate(BaseModel):
    name: Optional[str] = None
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
    tags: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[str] = None


class TemplateButtonItem(BaseModel):
    type: str           # QUICK_REPLY | URL | PHONE_NUMBER
    text: str
    url: Optional[str] = None
    phone_number: Optional[str] = None


class TemplateMetaCreate(BaseModel):
    name: str                               # display name (stored locally)
    meta_template_name: str                 # snake_case, sent to Meta
    category: str                           # MARKETING | UTILITY | AUTHENTICATION
    language: str = "en"                    # default en, not shown in UI
    body: str                               # body text with {{1}}, {{2}} placeholders
    header: Optional[str] = None            # optional header text
    header_image_url: Optional[str] = None  # optional header image URL
    footer: Optional[str] = None            # optional footer text
    buttons: Optional[List[TemplateButtonItem]] = None
    variable_samples: Optional[List[str]] = None  # sample values for {{1}}, {{2}}, ...


class TemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    body: str
    tags: Optional[str] = None
    connection_type: Optional[str] = "qr"
    meta_template_name: Optional[str] = None
    meta_category: Optional[str] = None
    meta_status: Optional[str] = None
    meta_language: Optional[str] = None
    meta_header_image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Campaign Schemas ─────────────────────────────────────────────────────────


class CampaignCreate(BaseModel):
    name: str
    template_id: Optional[int] = None
    lead_group_id: Optional[int] = None
    lead_group_ids: Optional[List[int]] = None
    scheduled_at: Optional[datetime] = None
    recurrence: Optional[str] = "one_time"
    recurrence_config: Optional[str] = None
    tags: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    template_id: Optional[int] = None
    lead_group_id: Optional[int] = None
    lead_group_ids: Optional[List[int]] = None
    scheduled_at: Optional[datetime] = None
    recurrence: Optional[str] = None
    recurrence_config: Optional[str] = None
    tags: Optional[str] = None


class CampaignResponse(BaseModel):
    id: int
    user_id: int
    name: str
    template_id: Optional[int] = None
    lead_group_id: Optional[int] = None
    lead_group_ids: Optional[List[int]] = None
    status: str
    scheduled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    recurrence: Optional[str] = "one_time"
    recurrence_config: Optional[str] = None
    tags: Optional[str] = None
    template_name: Optional[str] = None
    lead_group_name: Optional[str] = None
    lead_group_names: Optional[List[str]] = None
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
    run_number: Optional[int] = 1

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
    wa_type: Optional[str] = "qr"


class WAQRResponse(BaseModel):
    qr: Optional[str] = None
    status: str


class WAInfoResponse(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    connected_at: Optional[str] = None
    wa_type: Optional[str] = "qr"


class WAMetaConnectRequest(BaseModel):
    phone_id: str
    access_token: str
    waba_id: str
