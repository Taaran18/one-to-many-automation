-- ============================================================================
-- OneToMany Automation — Seed Data (optional, for testing only)
--
-- Run AFTER schema.sql.
-- Creates one demo user (password: "password123") and sample records.
-- DO NOT run this in production.
-- ============================================================================

-- Demo user
-- Password hash below is bcrypt of "password123" (cost=10)
INSERT INTO users (email, phone_no, password, full_name, company_name, company_type, plan)
VALUES (
  'demo@example.com',
  '+910000000000',
  '$2b$10$K5HJV0G6XD0Jk3gR1v.6aOMf4i.0MfVmZB6B5y8M5VYvCbp7mAqGO',
  'Demo User',
  'Demo Company',
  'Technology / SaaS',
  'free'
)
ON CONFLICT DO NOTHING;

-- Demo lead group
INSERT INTO lead_groups (user_id, name, description)
SELECT id, 'Sample Group', 'Auto-created seed group'
FROM users WHERE email = 'demo@example.com'
ON CONFLICT DO NOTHING;

-- Demo leads
INSERT INTO leads (user_id, name, phone_no, email, status)
SELECT id, 'Alice Smith',  '+919876543210', 'alice@example.com', 'prospect' FROM users WHERE email = 'demo@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO leads (user_id, name, phone_no, email, status)
SELECT id, 'Bob Jones',   '+919876543211', 'bob@example.com',   'customer' FROM users WHERE email = 'demo@example.com'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- End of seed data
-- ============================================================================
