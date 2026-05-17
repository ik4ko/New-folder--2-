-- Add customer_service role to brokers table
ALTER TABLE brokers DROP CONSTRAINT IF EXISTS brokers_role_check;
ALTER TABLE brokers ADD CONSTRAINT brokers_role_check
  CHECK (role IN ('agency_owner', 'agency_admin', 'customer_service', 'broker', 'solo_broker'));

-- Also allow CS in agency_invites
ALTER TABLE agency_invites DROP CONSTRAINT IF EXISTS agency_invites_role_check;
ALTER TABLE agency_invites ADD CONSTRAINT agency_invites_role_check
  CHECK (role IN ('broker', 'agency_admin', 'customer_service'));

-- Update is_principal — CS is NOT a principal (cannot manage team/billing)
CREATE OR REPLACE FUNCTION is_principal(p_agency_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
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
$$;

-- New: is_staff — owner + admin + CS (can view all clients, submit on behalf)
CREATE OR REPLACE FUNCTION is_staff(p_agency_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM brokers
    WHERE user_id = auth.uid()
      AND agency_id = p_agency_id
      AND role IN ('agency_owner', 'agency_admin', 'customer_service')
  )
  OR EXISTS (
    SELECT 1 FROM agencies
    WHERE id = p_agency_id
      AND owner_id = auth.uid()
  );
$$;

-- CS RLS: ghl_contacts — staff can SELECT all contacts in agency
DROP POLICY IF EXISTS "cs_view_ghl_contacts" ON ghl_contacts;
CREATE POLICY "cs_view_ghl_contacts" ON ghl_contacts
  FOR SELECT TO authenticated
  USING (is_staff(agency_id));

-- CS RLS: vcc_submissions — staff can SELECT + INSERT (table has agency_id directly)
DROP POLICY IF EXISTS "cs_view_vcc_submissions" ON vcc_submissions;
CREATE POLICY "cs_view_vcc_submissions" ON vcc_submissions
  FOR SELECT TO authenticated
  USING (is_staff(agency_id));

DROP POLICY IF EXISTS "cs_insert_vcc_submissions" ON vcc_submissions;
CREATE POLICY "cs_insert_vcc_submissions" ON vcc_submissions
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(agency_id));

-- CS RLS: switch_alerts — staff can SELECT (table has agency_id directly)
DROP POLICY IF EXISTS "cs_view_switch_alerts" ON switch_alerts;
CREATE POLICY "cs_view_switch_alerts" ON switch_alerts
  FOR SELECT TO authenticated
  USING (is_staff(agency_id));

-- CS RLS: aor_submissions — staff can SELECT + INSERT (table has agency_id directly)
DROP POLICY IF EXISTS "cs_view_aor_submissions" ON aor_submissions;
CREATE POLICY "cs_view_aor_submissions" ON aor_submissions
  FOR SELECT TO authenticated
  USING (is_staff(agency_id));

DROP POLICY IF EXISTS "cs_insert_aor_submissions" ON aor_submissions;
CREATE POLICY "cs_insert_aor_submissions" ON aor_submissions
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(agency_id));

-- CS RLS: campaign_enrollments — staff can SELECT (table has agency_id directly)
DROP POLICY IF EXISTS "cs_view_campaign_enrollments" ON campaign_enrollments;
CREATE POLICY "cs_view_campaign_enrollments" ON campaign_enrollments
  FOR SELECT TO authenticated
  USING (is_staff(agency_id));
