from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    Table,
    Boolean,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum



class CampaignStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    completed = "completed"
    failed = "failed"


class MessageStatus(str, enum.Enum):
    sent = "sent"
    delivered = "delivered"
    failed = "failed"


class WASessionStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    qr_pending = "qr_pending"


class WAConnectionType(str, enum.Enum):
    qr = "qr"
    meta = "meta"


class TemplateConnectionType(str, enum.Enum):
    qr = "qr"
    meta = "meta"


lead_group_members = Table(
    "lead_group_members",
    Base.metadata,
    Column(
        "lead_group_id",
        Integer,
        ForeignKey("lead_groups.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "lead_id", Integer, ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True
    ),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone_no = Column(String(20), unique=True, index=True, nullable=True)
    password = Column(String(512), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leads = relationship("Lead", back_populates="owner", cascade="all, delete-orphan")
    lead_groups = relationship(
        "LeadGroup", back_populates="owner", cascade="all, delete-orphan"
    )
    templates = relationship(
        "Template", back_populates="owner", cascade="all, delete-orphan"
    )
    campaigns = relationship(
        "Campaign", back_populates="owner", cascade="all, delete-orphan"
    )
    whatsapp_session = relationship(
        "WhatsAppSession",
        back_populates="owner",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("user_id", "phone_no", name="uq_lead_user_phone"),
        Index("ix_leads_user_status", "user_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    phone_no = Column(String(30), nullable=False)
    email = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    address_line3 = Column(String(255), nullable=True)
    pincode = Column(String(20), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    tags = Column(Text, nullable=True)
    status = Column(String(100), default="prospect", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="leads")
    groups = relationship(
        "LeadGroup", secondary=lead_group_members, back_populates="members"
    )
    message_logs = relationship("MessageLog", back_populates="lead")


class LeadGroup(Base):
    __tablename__ = "lead_groups"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="lead_groups")
    members = relationship(
        "Lead", secondary=lead_group_members, back_populates="groups"
    )
    campaigns = relationship("Campaign", back_populates="lead_group")


class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "meta_template_name", name="uq_template_user_meta_name"
        ),
        Index("ix_templates_user_type", "user_id", "connection_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    tags = Column(Text, nullable=True)
    connection_type = Column(
        Enum(TemplateConnectionType, native_enum=False),
        nullable=False,
        default=TemplateConnectionType.qr,
    )
    meta_template_name = Column(String(255), nullable=True)
    meta_category = Column(String(50), nullable=True)
    meta_status = Column(String(50), nullable=True)
    meta_language = Column(String(20), nullable=True)
    meta_header_image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="templates")
    campaigns = relationship("Campaign", back_populates="template")


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (Index("ix_campaigns_user_status", "user_id", "status"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    lead_group_id = Column(Integer, ForeignKey("lead_groups.id"), nullable=True)
    status = Column(
        Enum(CampaignStatus, native_enum=False),
        default=CampaignStatus.draft,
        nullable=False,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    recurrence = Column(String(20), nullable=True, default="one_time")
    lead_group_ids = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    recurrence_config = Column(Text, nullable=True)
    run_count = Column(Integer, nullable=False, default=0)
    stop_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="campaigns")
    template = relationship("Template", back_populates="campaigns")
    lead_group = relationship("LeadGroup", back_populates="campaigns")
    message_logs = relationship(
        "MessageLog", back_populates="campaign", cascade="all, delete-orphan"
    )


class MessageLog(Base):
    __tablename__ = "message_logs"
    __table_args__ = (
        Index("ix_message_logs_campaign_status", "campaign_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    lead_id = Column(
        Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(
        Enum(MessageStatus, native_enum=False),
        default=MessageStatus.sent,
        nullable=False,
    )
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    error_message = Column(Text, nullable=True)
    run_number = Column(Integer, nullable=False, default=1)
    campaign = relationship("Campaign", back_populates="message_logs")
    lead = relationship("Lead", back_populates="message_logs")


class WhatsAppSession(Base):
    __tablename__ = "whatsapp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    status = Column(
        Enum(WASessionStatus, native_enum=False),
        default=WASessionStatus.disconnected,
        nullable=False,
    )
    last_seen = Column(DateTime(timezone=True), nullable=True)
    wa_type = Column(
        Enum(WAConnectionType, native_enum=False),
        default=WAConnectionType.qr,
        nullable=False,
    )
    meta_phone_id = Column(String(100), nullable=True)
    meta_access_token = Column(Text, nullable=True)
    meta_waba_id = Column(String(100), nullable=True)

    owner = relationship("User", back_populates="whatsapp_session")
