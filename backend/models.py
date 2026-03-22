from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class LeadStatus(str, enum.Enum):
    prospect = "prospect"
    customer = "customer"


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


# Association table for lead group members
lead_group_members = Table(
    "lead_group_members",
    Base.metadata,
    Column("lead_group_id", Integer, ForeignKey("lead_groups.id"), primary_key=True),
    Column("lead_id", Integer, ForeignKey("leads.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone_no = Column(String(20), unique=True, index=True, nullable=True)
    password = Column(String(512), nullable=False)

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

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    phone_no = Column(String(30), nullable=False)
    email = Column(String(255), nullable=True)
    tags = Column(Text, nullable=True)  # comma-separated tags
    status = Column(Enum(LeadStatus), default=LeadStatus.prospect, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="leads")
    groups = relationship(
        "LeadGroup", secondary=lead_group_members, back_populates="members"
    )
    message_logs = relationship(
        "MessageLog", back_populates="lead", cascade="all, delete-orphan"
    )


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

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="templates")
    campaigns = relationship("Campaign", back_populates="template")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    lead_group_id = Column(Integer, ForeignKey("lead_groups.id"), nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.draft, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
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

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.sent, nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    error_message = Column(Text, nullable=True)

    campaign = relationship("Campaign", back_populates="message_logs")
    lead = relationship("Lead", back_populates="message_logs")


class WhatsAppSession(Base):
    __tablename__ = "whatsapp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    status = Column(
        Enum(WASessionStatus), default=WASessionStatus.disconnected, nullable=False
    )
    last_seen = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", back_populates="whatsapp_session")
