-- Pillar 0: Beta access gate + seat limits

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS is_beta boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS max_admin_seats integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_broker_seats integer;

-- Safe constraint additions (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_subscription_tier_check;
  ALTER TABLE agencies ADD CONSTRAINT agencies_subscription_tier_check
    CHECK (subscription_tier IN ('trial','beta','broker','agency','enterprise'));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_subscription_status_check;
  ALTER TABLE agencies ADD CONSTRAINT agencies_subscription_status_check
    CHECK (subscription_status IN ('trial','active','past_due','cancelled','beta'));
EXCEPTION WHEN others THEN NULL;
END $$;
