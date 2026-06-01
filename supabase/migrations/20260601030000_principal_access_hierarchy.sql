-- ============================================================
-- 3-Tier Principal Access Hierarchy — Audit & Documentation
-- Migration: 20260601030000_principal_access_hierarchy
--
-- This migration documents the authoritative access model and
-- adds any missing policies for tables introduced after the
-- initial broker-isolation migration (20260528030000).
--
-- ══════════════════════════════════════════════════════════
-- ACCESS MODEL (source of truth)
-- ══════════════════════════════════════════════════════════
--
-- TIER 1 — OWNER (agency_owner / agencies.owner_id = auth.uid())
--   • Full read + write on ALL records scoped to their agency_id
--   • Exclusive control of billing columns on the agencies row
--   • May view all broker sub-accounts in the agency downline
--   • May toggle between agency-wide view and their own selling book
--     via the ?view=my_book parameter on /dashboard/admin (app layer only)
--
-- TIER 2 — MANAGER / CS (role IN ('agency_admin','customer_service'))
--   • Broad SELECT across all agency records (same visibility as owner)
--   • Limited write: can update/enrich member records and acknowledge alerts
--   • Cannot modify billing columns, invite brokers, or cancel subscriptions
--   • customer_service: same read scope, no write on production records
--
-- TIER 3 — BROKER (role = 'broker' OR default)
--   • SELECT and write restricted to records where broker_id = their broker row id
--   • Cannot see other brokers' members, alerts, or VCC submissions
--   • book_of_business: .eq('broker_id', brokerRow.id) enforced at API layer
--     (book/page.tsx) in addition to the RLS policies below
--
-- ══════════════════════════════════════════════════════════
-- EXISTING POLICIES (established in earlier migrations)
-- ══════════════════════════════════════════════════════════
--
-- book_of_business  (20260528030000_broker_isolated_rls)
--   bob_owner_all           FOR ALL  — owner
--   bob_staff_select        FOR SELECT — agency_admin, customer_service
--   bob_staff_write         FOR UPDATE — agency_admin, customer_service
--   bob_broker_own_select   FOR SELECT — broker (broker_id match)
--   bob_broker_own_write    FOR INSERT — broker
--   bob_broker_own_update   FOR UPDATE — broker
--   bob_broker_own_delete   FOR DELETE — broker
--
-- switch_alerts  (20260528030000_broker_isolated_rls)
--   alerts_owner_all          FOR ALL    — owner
--   alerts_staff_select       FOR SELECT — agency_admin, customer_service
--   alerts_staff_write        FOR UPDATE — agency_admin, customer_service
--   alerts_broker_own_select  FOR SELECT — broker (broker_id match)
--   alerts_broker_own_write   FOR INSERT — broker
--   alerts_critical_pending_broadcast — any future-effective alert is broadcast
--                                        to all agency members for awareness
--
-- vcc_submissions  (20260601010000_vcc_submissions_broker_isolation)
--   vcc_owner_all           FOR ALL    — owner
--   vcc_staff_select        FOR SELECT — agency_admin, customer_service
--   vcc_broker_own_select   FOR SELECT — broker (broker_id match)
--   vcc_broker_own_insert   FOR INSERT — broker
--   vcc_broker_own_update   FOR UPDATE — broker
--
-- ghl_contacts  (20260528030000_broker_isolated_rls)
--   contacts_owner_all        FOR ALL    — owner
--   contacts_staff_select     FOR SELECT — agency_admin, customer_service
--   contacts_broker_own_select FOR SELECT — broker (assigned_broker_id = auth.uid())
--   contacts_broker_own_write  FOR INSERT — broker
--   contacts_broker_own_update FOR UPDATE — broker
--
-- agencies, brokers, audit_log, billing_events, campaign_enrollments,
-- aep_schedule, agency_credentials  (20260517000000_fix_rls_infinite_recursion)
--   All scoped to agency membership (owner UNION broker agency_id).
--   campaign_enrollments and aep_schedule are intentionally agency-scoped
--   rather than broker-isolated because campaigns are shared workflows.
--
-- ══════════════════════════════════════════════════════════
-- NEW: aep_schedule broker-visibility policy
-- ══════════════════════════════════════════════════════════
-- The /dashboard/admin page queries aep_schedule with the service role
-- (bypasses RLS). The auth-client path for brokers already inherits the
-- agency-scoped 'aep_access' policy from the recursion-fix migration, so
-- brokers see all AEP schedules in their agency — by design, since AEP
-- campaigns are agency-shared workflows rather than per-broker records.
-- No new policy changes are required.
--
-- ══════════════════════════════════════════════════════════
-- NEW: Index to support admin directory page performance
-- ══════════════════════════════════════════════════════════
-- The Agency Directory page fetches all book_of_business for the agency
-- sorted by full_name. An index on (agency_id, full_name) supports this.

CREATE INDEX IF NOT EXISTS idx_bob_agency_name
  ON public.book_of_business(agency_id, full_name)
  WHERE full_name IS NOT NULL;

-- The clinic fax monitor groups vcc_submissions by doctor_fax.
-- An index on (agency_id, doctor_fax) speeds up the full-agency fetch.

CREATE INDEX IF NOT EXISTS idx_vcc_agency_doctor_fax
  ON public.vcc_submissions(agency_id, doctor_fax)
  WHERE doctor_fax IS NOT NULL;

-- ══════════════════════════════════════════════════════════
-- COMMENT: Application-layer enforcement (book/page.tsx)
-- ══════════════════════════════════════════════════════════
-- The Book of Business page uses supabaseAdmin (service role) to fetch
-- members. The service role bypasses RLS, so the broker isolation filter
-- is applied in application code:
--
--   if (!isStaff && brokerRow?.id) {
--     membersQuery = membersQuery.eq('broker_id', brokerRow.id)
--   }
--
-- This double-enforces the same boundary: RLS blocks unauthorised reads
-- when using the auth client; the application filter blocks them when
-- using the service client. Both must agree for defence-in-depth.
-- ============================================================

COMMENT ON TABLE public.book_of_business IS
  '3-tier access: Owner=all, Staff(admin/cs)=read-all, Broker=own rows only. '
  'RLS policies in 20260528030000. App-layer filter in book/page.tsx.';

COMMENT ON TABLE public.vcc_submissions IS
  '3-tier access: Owner=all, Staff=read-all, Broker=own rows only. '
  'RLS policies in 20260601010000. Server action gate in vcc-submit.ts.';
