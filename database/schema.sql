-- ============================================================================
-- OneToMany Automation — Full Database Schema
-- PostgreSQL (compatible with Supabase)
--
-- Run this file against a blank database to create all tables from scratch.
-- Tables are ordered so foreign key dependencies are always satisfied.
-- ============================================================================


-- ── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL        PRIMARY KEY,
  email        VARCHAR(255)  UNIQUE,
  phone_no     VARCHAR(20)   UNIQUE,
  password     VARCHAR(512)  NOT NULL,
  full_name    VARCHAR(255),
  company_name VARCHAR(255),
  company_type VARCHAR(100),
  plan         VARCHAR(50)   DEFAULT 'free',
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);


-- ── Lead Groups ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_groups (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ── Leads ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone_no      VARCHAR(30)  NOT NULL,
  email         VARCHAR(255),
  company_name  VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  address_line3 VARCHAR(255),
  pincode       VARCHAR(20),
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100),
  tags          TEXT,
  status        VARCHAR(100) NOT NULL DEFAULT 'prospect',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),

  CONSTRAINT uq_lead_user_phone UNIQUE (user_id, phone_no)
);

CREATE INDEX IF NOT EXISTS ix_leads_user_status ON leads (user_id, status);


-- ── Lead Group Members (junction) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_group_members (
  lead_group_id INTEGER NOT NULL REFERENCES lead_groups(id) ON DELETE CASCADE,
  lead_id       INTEGER NOT NULL REFERENCES leads(id)       ON DELETE CASCADE,

  PRIMARY KEY (lead_group_id, lead_id)
);


-- ── Templates ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS templates (
  id                    SERIAL       PRIMARY KEY,
  user_id               INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  body                  TEXT         NOT NULL,
  tags                  TEXT,
  connection_type       VARCHAR(10)  NOT NULL DEFAULT 'qr',
  meta_template_name    VARCHAR(255),
  meta_category         VARCHAR(50),
  meta_status           VARCHAR(50),
  meta_language         VARCHAR(20),
  meta_header_image_url TEXT,
  meta_variable_map     TEXT,
  email_subject         TEXT,
  email_html            TEXT,
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW(),

  CONSTRAINT uq_template_user_meta_name UNIQUE (user_id, meta_template_name)
);

CREATE INDEX IF NOT EXISTS ix_templates_user_type ON templates (user_id, connection_type);


-- ── Campaigns ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id                SERIAL       PRIMARY KEY,
  user_id           INTEGER      NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  template_id       INTEGER               REFERENCES templates(id)  ON DELETE SET NULL,
  lead_group_id     INTEGER               REFERENCES lead_groups(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'draft',
  scheduled_at      TIMESTAMPTZ,
  recurrence        VARCHAR(20)           DEFAULT 'one_time',
  lead_group_ids    TEXT,
  tags              TEXT,
  recurrence_config TEXT,
  run_count         INTEGER      NOT NULL DEFAULT 0,
  stop_at           TIMESTAMPTZ,
  channel           VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_campaigns_user_status ON campaigns (user_id, status);


-- ── Message Logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS message_logs (
  id            SERIAL      PRIMARY KEY,
  campaign_id   INTEGER     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id       INTEGER              REFERENCES leads(id)     ON DELETE SET NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'sent',
  sent_at       TIMESTAMPTZ          DEFAULT NOW(),
  error_message TEXT,
  run_number    INTEGER     NOT NULL DEFAULT 1,
  body_text     TEXT
);

CREATE INDEX IF NOT EXISTS ix_message_logs_campaign_status ON message_logs (campaign_id, status);


-- ── Incoming Messages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incoming_messages (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_no      VARCHAR(30)  NOT NULL,
  body          TEXT         NOT NULL,
  received_at   TIMESTAMPTZ  DEFAULT NOW(),
  is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
  wa_message_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS ix_incoming_user_phone ON incoming_messages (user_id, phone_no);


-- ── WhatsApp Sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id                SERIAL      PRIMARY KEY,
  user_id           INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status            VARCHAR(20) NOT NULL DEFAULT 'disconnected',
  last_seen         TIMESTAMPTZ,
  wa_type           VARCHAR(10) NOT NULL DEFAULT 'qr',
  meta_phone_id     VARCHAR(100),
  meta_access_token TEXT,
  meta_waba_id      VARCHAR(100)
);


-- ── Email Sessions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sessions (
  id           SERIAL      PRIMARY KEY,
  user_id      INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email        VARCHAR(255),
  display_name VARCHAR(255),
  provider     VARCHAR(50),
  smtp_host    VARCHAR(255),
  smtp_port    INTEGER,
  status       VARCHAR(20) NOT NULL DEFAULT 'disconnected',
  last_seen    TIMESTAMPTZ
);


-- ── Chat Settings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_settings (
  id          SERIAL  PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_no    VARCHAR(30) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT uq_chat_setting_user_phone UNIQUE (user_id, phone_no)
);


-- ============================================================================
-- End of schema
-- ============================================================================
