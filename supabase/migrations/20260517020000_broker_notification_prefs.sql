-- Add notification_preferences jsonb column to brokers
-- Used by the broker settings notifications page
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  NOT NULL DEFAULT '{"switch_alert":true,"vcc_deadline":true,"weekly_digest":true}'::jsonb;
