-- fix_rls_infinite_recursion
-- Root cause: broker_agency_access policy on brokers table self-references
-- the brokers table (SELECT agency_id FROM brokers WHERE user_id = auth.uid())
-- causing infinite recursion → 500 errors on every brokers query.
--
-- Fix: drop all policies that use is_principal() or self-reference,
-- replace with flat subquery policies that have no recursion risk.

-- ---------------------------------------------------------------------------
-- Step 1: Drop ALL existing policies on affected tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE tablename IN (
      'agencies','brokers','ghl_contacts',
      'vcc_submissions','switch_alerts','aor_submissions',
      'roster_uploads','roster_members','campaign_enrollments',
      'aep_schedule','agency_invites','audit_log',
      'billing_events','vcc_form_templates',
      'campaign_templates','carrier_email_forwards',
      'agency_credentials','retention_events'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: Drop old helper functions that may reference agencies inside
-- policies on agencies (circular dep risk)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS is_principal(uuid);
DROP FUNCTION IF EXISTS is_staff(uuid);
DROP FUNCTION IF EXISTS get_my_role(uuid);

-- ---------------------------------------------------------------------------
-- Step 3: Recreate clean policies — NO function calls, NO self-references
-- ---------------------------------------------------------------------------

-- AGENCIES: owner only (simple, no recursion possible)
CREATE POLICY "agencies_owner" ON agencies
  FOR ALL USING (owner_id = (SELECT auth.uid()));

-- BROKERS: two separate policies, neither self-references brokers
-- Policy 1: every broker can see/update their own row
CREATE POLICY "brokers_own_row" ON brokers
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Policy 2: agency owner can see all brokers in their agency
CREATE POLICY "brokers_agency_owner_sees_all" ON brokers
  FOR SELECT USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
    )
  );

-- GHL_CONTACTS: agency-scoped via direct join, no function calls
CREATE POLICY "contacts_agency_access" ON ghl_contacts
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- VCC_SUBMISSIONS: agency-scoped
CREATE POLICY "vcc_agency_access" ON vcc_submissions
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- SWITCH_ALERTS: agency-scoped
CREATE POLICY "alerts_agency_access" ON switch_alerts
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- AOR_SUBMISSIONS: agency-scoped
CREATE POLICY "aor_agency_access" ON aor_submissions
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ROSTER_UPLOADS: agency-scoped
CREATE POLICY "roster_uploads_access" ON roster_uploads
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ROSTER_MEMBERS: agency-scoped
CREATE POLICY "roster_members_access" ON roster_members
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- CAMPAIGN_ENROLLMENTS: agency-scoped
CREATE POLICY "enrollments_access" ON campaign_enrollments
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- AEP_SCHEDULE: agency-scoped
CREATE POLICY "aep_access" ON aep_schedule
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- AGENCY_INVITES: agency-scoped
CREATE POLICY "invites_access" ON agency_invites
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- AUDIT_LOG: read for agency members, insert-only append
CREATE POLICY "audit_read" ON audit_log
  FOR SELECT USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- BILLING_EVENTS: owner only
CREATE POLICY "billing_owner" ON billing_events
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
    )
  );

-- VCC_FORM_TEMPLATES: all authenticated users can read
CREATE POLICY "templates_read" ON vcc_form_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- CAMPAIGN_TEMPLATES: all authenticated users can read
CREATE POLICY "campaign_templates_read" ON campaign_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- CARRIER_EMAIL_FORWARDS: agency-scoped
CREATE POLICY "forwards_access" ON carrier_email_forwards
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- AGENCY_CREDENTIALS: owner only (protects OAuth tokens)
CREATE POLICY "credentials_owner_only" ON agency_credentials
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
    )
  );

-- RETENTION_EVENTS: agency-scoped
CREATE POLICY "events_agency_access" ON retention_events
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT agency_id FROM brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Step 4: Recreate helper function with no circular dependency risk
-- SECURITY DEFINER bypasses RLS so the subqueries inside run as superuser
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT id FROM agencies WHERE owner_id = auth.uid() LIMIT 1),
    (SELECT agency_id FROM brokers WHERE user_id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
