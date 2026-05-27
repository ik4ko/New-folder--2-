-- Detection System: carrier_logins table + ghl_contacts verification columns

-- ── carrier_logins ────────────────────────────────────────────────────────────
-- Core table for storing encrypted carrier portal credentials per broker.
-- Dropped in the initial schema migration and never recreated — create it now.
CREATE TABLE IF NOT EXISTS carrier_logins (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  broker_id             uuid REFERENCES brokers(id) ON DELETE CASCADE,
  carrier               text NOT NULL,
  username              text NOT NULL,
  password_encrypted    text NOT NULL,
  last_checked_at       timestamp with time zone,
  mfa_type              text NOT NULL DEFAULT 'none'
    CHECK (mfa_type IN ('none', 'sms', 'email', 'totp')),
  mfa_phone             text,
  last_mfa_required_at  timestamp with time zone,
  status                text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'mfa_required', 'login_failed', 'suspended')),
  created_at            timestamp with time zone DEFAULT now(),
  updated_at            timestamp with time zone DEFAULT now(),
  UNIQUE (agency_id, broker_id, carrier)
);

ALTER TABLE carrier_logins ENABLE ROW LEVEL SECURITY;

-- Principals can see all credentials for their agency
DROP POLICY IF EXISTS "carrier_logins_principal" ON carrier_logins;
CREATE POLICY "carrier_logins_principal" ON carrier_logins
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id FROM brokers
        WHERE user_id = auth.uid()
          AND role IN ('agency_owner', 'agency_admin', 'customer_service')
    )
  );

-- Brokers can only manage their own credentials
DROP POLICY IF EXISTS "carrier_logins_broker_own" ON carrier_logins;
CREATE POLICY "carrier_logins_broker_own" ON carrier_logins
  FOR ALL USING (
    broker_id IN (SELECT id FROM brokers WHERE user_id = auth.uid())
  );

-- ── ghl_contacts: verification status ────────────────────────────────────────
ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS last_verified_at   timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('verified', 'unverified', 'missing', 'new'));

-- ── roster_uploads: allow NULL uploaded_by for automated scheduler runs ───────
ALTER TABLE roster_uploads
  ALTER COLUMN uploaded_by DROP NOT NULL;
