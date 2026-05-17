-- correct_role_hierarchy_and_ghl_per_broker
-- Expands broker roles to agency_owner/solo_broker, adds per-broker GHL
-- columns, is_principal() helper, and subscription columns on agencies.

-- 0. Patch any legacy 'admin' rows (provision-agency.ts bug pre-constraint)
UPDATE brokers SET role = 'agency_owner' WHERE role = 'admin';

-- 1. Update role constraint to include all roles
ALTER TABLE brokers DROP CONSTRAINT IF EXISTS brokers_role_check;
ALTER TABLE brokers ADD CONSTRAINT brokers_role_check
  CHECK (role IN ('agency_owner','agency_admin','broker','solo_broker'));

-- 2. Each broker can have their OWN GHL connection
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS ghl_location_id text,
  ADD COLUMN IF NOT EXISTS ghl_connected_at timestamp with time zone;

-- 3. Update is_principal to cover agency_owner role in brokers table
--    AND the agencies.owner_id path (for solo_broker who owns their agency)
CREATE OR REPLACE FUNCTION is_principal(p_agency_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM brokers
    WHERE user_id = auth.uid()
    AND agency_id = p_agency_id
    AND role IN ('agency_owner', 'agency_admin')
  )
  OR EXISTS (
    SELECT 1 FROM agencies
    WHERE id = p_agency_id
    AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Subscription metadata on agencies
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS subscription_tier text
    DEFAULT 'solo'
    CHECK (subscription_tier IN ('solo','starter','professional','enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status text
    DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','past_due','cancelled')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;
