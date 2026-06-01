-- ============================================================
-- Broker-isolated RLS for vcc_submissions
-- Migration: 20260601010000_vcc_submissions_broker_isolation
--
-- Root cause:
--   20260517000000_fix_rls_infinite_recursion replaced all policies
--   with a single flat "vcc_agency_access" policy (FOR ALL) scoped
--   to agency membership. This means any broker in a multi-broker
--   agency can read — and via direct server-action calls, mutate —
--   every VCC submission regardless of who created it.
--
--   vcc_submissions contains client name, DOB, MBI, doctor name,
--   and fax numbers. Cross-broker read access is a HIPAA concern.
--
-- Fix:
--   Replace the flat agency-scoped policy with a three-tier model
--   matching the pattern applied to book_of_business and switch_alerts
--   in 20260528030000_broker_isolated_rls:
--
--   OWNER  → full access to all submissions in their agency
--   STAFF  → broad read access (agency_admin, customer_service)
--   BROKER → read and write only their own submissions (broker_id match)
--
-- The vcc-submit.ts server actions (markVCCSigned, resendVCCFax) add
-- an auth-client access check before any service-role write. The auth
-- client now enforces this policy, so those checks double-enforce the
-- same boundary at the application layer.
-- ============================================================

-- Drop the existing flat policy
DROP POLICY IF EXISTS "vcc_agency_access" ON public.vcc_submissions;

-- ── OWNER: full access to all submissions in their agency ───────────────────
CREATE POLICY "vcc_owner_all"
  ON public.vcc_submissions
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = (SELECT auth.uid())
    )
  );

-- ── STAFF (agency_admin, customer_service): read all submissions ────────────
-- Staff need visibility across all brokers for support and oversight.
CREATE POLICY "vcc_staff_select"
  ON public.vcc_submissions
  FOR SELECT
  USING (
    agency_id IN (
      SELECT b.agency_id
      FROM public.brokers b
      WHERE b.user_id = (SELECT auth.uid())
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- ── BROKER: read only their own submissions ─────────────────────────────────
CREATE POLICY "vcc_broker_own_select"
  ON public.vcc_submissions
  FOR SELECT
  USING (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ── BROKER: insert only their own submissions ───────────────────────────────
CREATE POLICY "vcc_broker_own_insert"
  ON public.vcc_submissions
  FOR INSERT
  WITH CHECK (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = (SELECT auth.uid())
    )
    AND agency_id IN (
      SELECT agency_id FROM public.brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ── BROKER: update only their own submissions ───────────────────────────────
-- Note: markVCCSigned and resendVCCFax use the service role for the actual
-- write but now gate on an auth-client access check first. This policy
-- provides a belt-and-suspenders enforcement at the DB layer for any
-- future code paths that use the auth client for updates directly.
CREATE POLICY "vcc_broker_own_update"
  ON public.vcc_submissions
  FOR UPDATE
  USING (
    broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ── Index: broker_id lookup for the new RLS policies ───────────────────────
CREATE INDEX IF NOT EXISTS idx_vcc_submissions_broker_id
  ON public.vcc_submissions(broker_id)
  WHERE broker_id IS NOT NULL;
