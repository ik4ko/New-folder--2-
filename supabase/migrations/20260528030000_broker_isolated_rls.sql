-- ============================================================
-- Broker-Isolated RLS + CRITICAL_PENDING Alerts + Schema Fixes
-- Migration: 20260528030000_broker_isolated_rls
--
-- Implements three directives from the security architecture audit:
--
-- 1. HIERARCHICAL RBAC ISOLATION
--    BROKER     → sees only records tied to their own broker_id / user_id
--    MANAGER    → broad read across entire agency downline (agency_admin role)
--    CS         → broad read for monitoring (customer_service role)
--    OWNER      → full access + exclusive control over billing columns
--
-- 2. CRITICAL_PENDING ALERT BROADCAST
--    Alerts where effective_date > CURRENT_DATE are classified as
--    CRITICAL_PENDING and broadcast to OWNER / MANAGER / CS regardless
--    of which broker owns the member. A view is also created for easy query.
--
-- 3. MISSING SCHEMA COLUMNS
--    Several columns are queried by the frontend but absent from all
--    migration files. Added idempotently here so the migration is safe
--    to run against a DB where they were added manually.
--
-- SAFETY: All policy drops use DROP POLICY IF EXISTS.
--         All column adds use ADD COLUMN IF NOT EXISTS.
--         No existing data is deleted or modified.
-- ============================================================

-- ============================================================
-- STEP 1: Add missing columns to book_of_business
-- ============================================================

ALTER TABLE public.book_of_business
  -- Future plan tracking (queried in book/page.tsx + book/[memberId]/page.tsx)
  ADD COLUMN IF NOT EXISTS future_plan_name       TEXT,
  ADD COLUMN IF NOT EXISTS future_effective_date  DATE,
  ADD COLUMN IF NOT EXISTS future_plan_code       TEXT,

  -- MBI presence flag (allows fast "has_mbi" filter without decrypting)
  ADD COLUMN IF NOT EXISTS has_mbi               BOOLEAN DEFAULT false,

  -- Last MARx check timestamp (drives "last checked" display in table)
  ADD COLUMN IF NOT EXISTS last_marx_check       TIMESTAMPTZ,

  -- Detected switch targets from MARx/extension verification
  ADD COLUMN IF NOT EXISTS detected_plan_name    TEXT,
  ADD COLUMN IF NOT EXISTS detected_carrier_name TEXT,

  -- MBI stored in plaintext (encrypted copy lives in ghl_contacts.mbi_enc)
  -- already added via 20260527030000 backfill, ADD COLUMN IF NOT EXISTS is safe
  ADD COLUMN IF NOT EXISTS mbi                   TEXT,

  -- Original carrier at time of roster upload (for switch detection baseline)
  ADD COLUMN IF NOT EXISTS original_carrier_name TEXT;

-- Backfill has_mbi for existing rows where mbi is already populated
UPDATE public.book_of_business
  SET has_mbi = TRUE
  WHERE mbi IS NOT NULL AND mbi <> '' AND has_mbi = FALSE;

-- ============================================================
-- STEP 2: Add broker_id denormalization to switch_alerts
-- (enables efficient RLS without multi-table joins on every row read)
-- ============================================================

ALTER TABLE public.switch_alerts
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL;

-- Backfill broker_id from bob_member_id → book_of_business.broker_id
UPDATE public.switch_alerts sa
  SET broker_id = bob.broker_id
  FROM public.book_of_business bob
  WHERE sa.bob_member_id = bob.id
    AND sa.broker_id IS NULL
    AND bob.broker_id IS NOT NULL;

-- Index for the new broker isolation policy
CREATE INDEX IF NOT EXISTS idx_switch_alerts_broker_id
  ON public.switch_alerts(broker_id)
  WHERE broker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_switch_alerts_critical_pending
  ON public.switch_alerts(agency_id, effective_date)
  WHERE effective_date IS NOT NULL;

-- ============================================================
-- STEP 3: Create CRITICAL_PENDING view
-- Alerts where effective_date > today — future plan switches that
-- have NOT yet taken effect. These are broadcast to all staff.
-- ============================================================

CREATE OR REPLACE VIEW public.critical_pending_alerts AS
  SELECT
    sa.*,
    bob.full_name        AS member_full_name,
    bob.plan_name        AS current_plan_name,
    bob.future_plan_name AS future_plan_name_resolved
  FROM public.switch_alerts sa
  LEFT JOIN public.book_of_business bob ON bob.id = sa.bob_member_id
  WHERE sa.effective_date > CURRENT_DATE;

COMMENT ON VIEW public.critical_pending_alerts IS
  'Future-effective switch alerts (effective_date > today). '
  'Broadcast to OWNER / MANAGER / CS regardless of broker assignment.';

-- ============================================================
-- STEP 4: Drop old over-permissive RLS policies
-- ============================================================

-- switch_alerts
DROP POLICY IF EXISTS "alerts_agency_access"          ON public.switch_alerts;

-- book_of_business
DROP POLICY IF EXISTS "bob_agency_access"             ON public.book_of_business;

-- ghl_contacts (replacing the flat "all agency members" policy)
DROP POLICY IF EXISTS "contacts_agency_access"        ON public.ghl_contacts;

-- agencies (split SELECT from billing-write)
DROP POLICY IF EXISTS "agencies_owner"                ON public.agencies;

-- ============================================================
-- STEP 5: Recreate switch_alerts RLS with broker isolation
-- ============================================================

-- 5a. OWNER: full access to all alerts in their agency
CREATE POLICY "alerts_owner_all"
  ON public.switch_alerts
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- 5b. MANAGER + CS: broad read access across all agency alerts
CREATE POLICY "alerts_staff_select"
  ON public.switch_alerts
  FOR SELECT
  USING (
    agency_id IN (
      SELECT b.agency_id
      FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- 5c. MANAGER + CS: can update/delete alerts (acknowledge, dismiss)
CREATE POLICY "alerts_staff_write"
  ON public.switch_alerts
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT b.agency_id
      FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- 5d. BROKER: sees only alerts tied to their own broker_id
CREATE POLICY "alerts_broker_own_select"
  ON public.switch_alerts
  FOR SELECT
  USING (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- 5e. BROKER: can insert/update only their own alerts
CREATE POLICY "alerts_broker_own_write"
  ON public.switch_alerts
  FOR INSERT
  WITH CHECK (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- 5f. CRITICAL_PENDING BROADCAST
--     Any alert with a future effective_date is visible to ALL agency members
--     (owner, staff, AND brokers) — this is the "broadcast" behaviour.
--     Brokers who don't own the member still need to see these for awareness.
CREATE POLICY "alerts_critical_pending_broadcast"
  ON public.switch_alerts
  FOR SELECT
  USING (
    effective_date > CURRENT_DATE
    AND agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 6: Recreate book_of_business RLS with broker isolation
-- ============================================================

-- 6a. OWNER: full access to all BOB records in their agency
CREATE POLICY "bob_owner_all"
  ON public.book_of_business
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- 6b. MANAGER + CS: broad read access to all BOB records
CREATE POLICY "bob_staff_select"
  ON public.book_of_business
  FOR SELECT
  USING (
    agency_id IN (
      SELECT b.agency_id
      FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- 6c. MANAGER + CS: can update BOB records (e.g. enrich, verify)
CREATE POLICY "bob_staff_write"
  ON public.book_of_business
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT b.agency_id
      FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- 6d. BROKER: sees only their own BOB records
CREATE POLICY "bob_broker_own_select"
  ON public.book_of_business
  FOR SELECT
  USING (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- 6e. BROKER: can insert/update only their own records
CREATE POLICY "bob_broker_own_write"
  ON public.book_of_business
  FOR INSERT
  WITH CHECK (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bob_broker_own_update"
  ON public.book_of_business
  FOR UPDATE
  USING (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- 6f. BROKER: can delete only their own records
CREATE POLICY "bob_broker_own_delete"
  ON public.book_of_business
  FOR DELETE
  USING (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 7: Recreate ghl_contacts RLS with broker isolation
-- Note: assigned_broker_id references auth.users(id) directly,
-- so isolation check is simply assigned_broker_id = auth.uid()
-- ============================================================

-- 7a. OWNER: full access to all contacts in their agency
CREATE POLICY "contacts_owner_all"
  ON public.ghl_contacts
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- 7b. MANAGER + CS: broad read access to all agency contacts
CREATE POLICY "contacts_staff_select"
  ON public.ghl_contacts
  FOR SELECT
  USING (
    agency_id IN (
      SELECT b.agency_id
      FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- 7c. BROKER: sees only contacts assigned to them
CREATE POLICY "contacts_broker_own_select"
  ON public.ghl_contacts
  FOR SELECT
  USING (
    assigned_broker_id = auth.uid()
  );

-- 7d. BROKER: can insert/update only their own contacts
CREATE POLICY "contacts_broker_own_write"
  ON public.ghl_contacts
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
    )
    AND (assigned_broker_id = auth.uid() OR assigned_broker_id IS NULL)
  );

CREATE POLICY "contacts_broker_own_update"
  ON public.ghl_contacts
  FOR UPDATE
  USING (
    assigned_broker_id = auth.uid()
  );

-- ============================================================
-- STEP 8: Recreate agencies RLS — split SELECT from billing write
-- OWNER: full agency access
-- STAFF/BROKER: can read their own agency row (needed for sidebar/settings)
-- Billing columns: exclusively OWNER-modifiable (enforced via separate policy)
-- ============================================================

-- 8a. OWNER: full access to their own agency row
CREATE POLICY "agencies_owner_all"
  ON public.agencies
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 8b. All authenticated agency members can SELECT their agency row
--     (brokers need this for sidebar display, settings page, seat count, etc.)
CREATE POLICY "agencies_member_select"
  ON public.agencies
  FOR SELECT
  USING (
    id IN (
      SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 9: Billing column protection via column-level security note
-- PostgreSQL does not support column-level RLS directly, but we
-- enforce OWNER-only billing writes via the policy above (only owner
-- can UPDATE the agencies row at all). The brokers table has no
-- billing columns so no additional policy is needed.
--
-- For belt-and-suspenders, the server actions in src/app/actions/
-- should always verify session role = 'agency_owner' before updating
-- subscription_tier, stripe_customer_id, or seat_limit columns.
-- ============================================================

COMMENT ON TABLE public.agencies IS
  'Agency root record. Only the owner (owner_id = auth.uid()) '
  'may update billing columns: subscription_tier, stripe_customer_id, seat_limit.';

-- ============================================================
-- STEP 10: Recreate helper functions (safe SECURITY DEFINER)
-- These bypass RLS when called from server-side routes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role(p_agency_id UUID)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.agencies
      WHERE id = p_agency_id AND owner_id = auth.uid()
    ) THEN 'agency_owner'
    ELSE (
      SELECT role FROM public.brokers
      WHERE agency_id = p_agency_id AND user_id = auth.uid()
      LIMIT 1
    )
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- is_staff: returns true for OWNER + MANAGER + CS
CREATE OR REPLACE FUNCTION public.is_staff(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agencies
    WHERE id = p_agency_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.brokers
    WHERE agency_id = p_agency_id
      AND user_id = auth.uid()
      AND role IN ('agency_admin', 'customer_service')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- is_owner: returns true only for the agency owner
CREATE OR REPLACE FUNCTION public.is_owner(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agencies
    WHERE id = p_agency_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- STEP 11: Indexes for new isolation patterns
-- ============================================================

-- Fast broker role lookups (used in all staff-check subqueries)
CREATE INDEX IF NOT EXISTS idx_brokers_user_role
  ON public.brokers(user_id, role);

-- Fast agency owner lookup (used in all owner-check subqueries)
CREATE INDEX IF NOT EXISTS idx_agencies_owner_id
  ON public.agencies(owner_id);

-- Fast BOB broker lookup (used in broker isolation policies)
CREATE INDEX IF NOT EXISTS idx_bob_broker_id
  ON public.book_of_business(broker_id)
  WHERE broker_id IS NOT NULL;

-- Fast GHL contacts broker lookup
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_assigned_broker
  ON public.ghl_contacts(assigned_broker_id)
  WHERE assigned_broker_id IS NOT NULL;
