-- ============================================================
-- Compliance-Grade Enterprise Audit Trail
-- Migration: 20260528050000_enterprise_audit_logs
--
-- Purpose:
--   HIPAA §164.312(b) requires audit controls — hardware, software,
--   and procedural mechanisms that record and examine activity in
--   information systems that contain or use ePHI.
--
--   This table is a purpose-built compliance audit log that supplements
--   the existing general-purpose `audit_log` table. Key differences:
--
--   audit_log              → general agency events (CRM sync, alert created, etc.)
--   enterprise_audit_logs  → PHI-touch events, data export, MBI access, IP tracking
--
--   This table is APPEND-ONLY. The RLS policies block all UPDATE and DELETE
--   operations from every authenticated role. Only the service role can write.
--
--   Retention: HIPAA requires 6-year audit log retention (§164.316(b)(2)(i)).
--   The `created_at` column must never be overwritten. Archival scripts should
--   move rows older than 6 years to cold storage, not delete them.
--
-- PHI-Touch Action Types:
--   MBI_REVEAL       — broker opened the MBI reveal overlay modal
--   MBI_COPY         — broker clicked "Copy" on the MBI overlay
--   CSV_EXPORT       — broker exported Book of Business as CSV
--   RECORD_MODIFY    — PHI-adjacent field updated (MBI entry, doctor info)
--   RECORD_DELETE    — member removed from Book of Business
--   RECORD_VIEW      — member detail page viewed (optional, can be high-volume)
--
-- Infrastructure Actions (non-PHI but auditable):
--   EDGE_MAP_FETCH   — Chrome extension fetched carrier selector manifest
--   API_KEY_GENERATE — extension_api_key generated/rotated
--   ROSTER_UPLOAD    — carrier roster CSV uploaded
--   ALERT_ACKNOWLEDGE— alert dismissed or marked resolved
--   CRM_SYNC         — member data pushed to GoHighLevel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Actor ────────────────────────────────────────────────────────────────
  agency_id       UUID        REFERENCES public.agencies(id) ON DELETE SET NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ── Action Classification ────────────────────────────────────────────────
  action_type     TEXT        NOT NULL
    CHECK (action_type IN (
      -- PHI-touch events
      'MBI_REVEAL',
      'MBI_COPY',
      'CSV_EXPORT',
      'RECORD_MODIFY',
      'RECORD_DELETE',
      'RECORD_VIEW',
      -- Infrastructure / operational events
      'EDGE_MAP_FETCH',
      'API_KEY_GENERATE',
      'ROSTER_UPLOAD',
      'ALERT_ACKNOWLEDGE',
      'CRM_SYNC',
      -- Authentication
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED'
    )),

  -- ── Resource Context ─────────────────────────────────────────────────────
  resource_type   TEXT,   -- 'book_of_business', 'switch_alerts', 'carrier_edge_maps', etc.
  resource_id     TEXT,   -- UUID or slug of the affected record

  -- ── Network / Session Context (HIPAA 164.312(b)) ─────────────────────────
  client_ip       TEXT,   -- From x-forwarded-for or x-real-ip header
  user_agent      TEXT,   -- Browser + extension identifier string
  session_id      TEXT,   -- Supabase session ID or extension install ID

  -- ── PHI Flag ─────────────────────────────────────────────────────────────
  -- Set TRUE whenever the event directly involves ePHI access or mutation.
  -- Used for rapid HIPAA breach-assessment triage: filter WHERE phi_touched = TRUE.
  phi_touched     BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Structured Payload ────────────────────────────────────────────────────
  -- Free-form JSON for event-specific context. Never store raw PHI here —
  -- use resource_id to reference the encrypted record.
  metadata        JSONB   NOT NULL DEFAULT '{}',

  -- ── Immutable Timestamp ──────────────────────────────────────────────────
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent ANY modification of existing rows at the DB level
CREATE OR REPLACE RULE enterprise_audit_logs_no_update
  AS ON UPDATE TO public.enterprise_audit_logs
  DO INSTEAD NOTHING;

CREATE OR REPLACE RULE enterprise_audit_logs_no_delete
  AS ON DELETE TO public.enterprise_audit_logs
  DO INSTEAD NOTHING;

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

-- OWNER can read their agency's audit trail (for compliance reporting)
CREATE POLICY "eal_owner_read"
  ON public.enterprise_audit_logs
  FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- MANAGER (agency_admin) can read audit trail for oversight
CREATE POLICY "eal_staff_read"
  ON public.enterprise_audit_logs
  FOR SELECT
  USING (
    agency_id IN (
      SELECT b.agency_id FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- INSERT: any agency member can log events (service role used by API routes)
-- INSERT via service role always bypasses RLS — this INSERT policy is for
-- any future client-side audit writes (e.g., MBI reveal fired from browser).
CREATE POLICY "eal_agency_insert"
  ON public.enterprise_audit_logs
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies — the NO_UPDATE / NO_DELETE rules above handle this
-- at the SQL rule level (even service role cannot update/delete).

-- ── Indexes ───────────────────────────────────────────────────────────────

-- Primary compliance query: all PHI events for an agency in a time range
CREATE INDEX IF NOT EXISTS idx_eal_agency_phi
  ON public.enterprise_audit_logs(agency_id, phi_touched, created_at DESC)
  WHERE phi_touched = TRUE;

-- HIPAA audit report: all events for a user (breach investigation)
CREATE INDEX IF NOT EXISTS idx_eal_user_timeline
  ON public.enterprise_audit_logs(user_id, created_at DESC);

-- Action-type filter (e.g., "show me all MBI_COPY events this month")
CREATE INDEX IF NOT EXISTS idx_eal_action_type
  ON public.enterprise_audit_logs(action_type, agency_id, created_at DESC);

-- Resource lookup (e.g., "who accessed member X")
CREATE INDEX IF NOT EXISTS idx_eal_resource
  ON public.enterprise_audit_logs(resource_type, resource_id, created_at DESC)
  WHERE resource_id IS NOT NULL;

-- ── Comments ─────────────────────────────────────────────────────────────

COMMENT ON TABLE public.enterprise_audit_logs IS
  'HIPAA §164.312(b) compliance audit trail. APPEND-ONLY — UPDATE/DELETE blocked by SQL rules. '
  '6-year retention required. PHI-touch events filtered via phi_touched = TRUE.';

COMMENT ON COLUMN public.enterprise_audit_logs.phi_touched IS
  'TRUE when the event directly involved ePHI access or mutation. '
  'Used for rapid HIPAA breach-assessment triage.';

COMMENT ON COLUMN public.enterprise_audit_logs.client_ip IS
  'Originating IP address from x-forwarded-for or x-real-ip. '
  'Required by HIPAA §164.312(b) for access control audit.';

COMMENT ON COLUMN public.enterprise_audit_logs.metadata IS
  'Event-specific structured context. NEVER store raw PHI here — '
  'use resource_id to reference the encrypted record in its source table.';
