-- ============================================================
-- Compliance Audit Log Table
-- Migration: 20260528070000_compliance_audit_logs
--
-- Purpose:
--   Human-readable, CMS/regulator-facing audit trail for all
--   compliance-sensitive operations in AegisSage.
--
-- Architecture note — two-table audit strategy:
--   enterprise_audit_logs  (migration 20260528050000)
--     → Machine-readable HIPAA §164.312(b) access log.
--       Stores action_type enums, phi_touched flag, JSON metadata.
--       Used for breach investigation and internal security review.
--
--   compliance_audit_logs  (this migration)
--     → Human-readable CMS/regulator-facing compliance trail.
--       Stores plain-English description, explicit status, IP address.
--       Designed to be exportable as a CSV for audit submissions.
--       Both tables fire on the same events for belt-and-suspenders
--       compliance coverage.
--
-- Immutability:
--   SQL rules block UPDATE and DELETE from all roles including service.
--   Rows are physically unalterable once written.
--   HIPAA requires 6-year retention of audit logs (§164.316(b)(2)(i)).
--
-- PHI Policy:
--   The `description` field MUST contain only metadata — counts, modes,
--   batch positions. NEVER store raw MBI values, member names, SSNs,
--   or any other ePHI in any column of this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compliance_audit_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Actor ────────────────────────────────────────────────────────────────
  agency_id        UUID        REFERENCES public.agencies(id) ON DELETE SET NULL,
  broker_user_id   UUID        REFERENCES auth.users(id)     ON DELETE SET NULL,

  -- ── Event classification ────────────────────────────────────────────────
  event_type       TEXT        NOT NULL
    CHECK (event_type IN (
      -- CRM data movement
      'CRM_EXPORT_STARTED',     -- BOB → GHL push invocation started
      'CRM_EXPORT_COMPLETED',   -- BOB → GHL push invocation finished
      'CRM_EXPORT_FAILED',      -- BOB → GHL push invocation errored
      'CRM_IMPORT_STARTED',     -- GHL → BOB inbound sync started
      'CRM_IMPORT_COMPLETED',   -- GHL → BOB inbound sync finished
      -- PHI access
      'PHI_ACCESS',             -- Any read of a PHI-adjacent field
      'MBI_REVEAL',             -- Broker opened the MBI reveal overlay
      'MBI_COPY',               -- Broker copied an MBI to clipboard
      -- Data ingestion
      'ROSTER_UPLOAD',          -- Carrier CSV or Google Sheets roster import
      'ROSTER_UPLOAD_ERRORS',   -- Roster rows rejected during import
      -- Member lifecycle
      'MEMBER_DELETE',          -- Member removed from Book of Business
      'ALERT_ACKNOWLEDGE',      -- Switch alert marked resolved or dismissed
      -- Security events
      'API_KEY_GENERATED',      -- Extension API key created or rotated
      'LOGIN',                  -- Successful authentication
      'LOGIN_FAILED'            -- Failed authentication attempt
    )),

  -- ── Human-readable description ──────────────────────────────────────────
  -- Plain-English summary for regulators and compliance officers.
  -- MUST contain only metadata (counts, modes, timestamps).
  -- PHI FORBIDDEN: no names, MBIs, plan codes, or any ePHI.
  -- Examples:
  --   "BOB→GHL push: 50 of 200 members (batch 1–50). Created: 12, Updated: 38, Failed: 0."
  --   "GHL inbound sync: 847 contacts imported (incremental mode)."
  --   "Roster upload: 68 rows processed, 3 rejected (invalid MBI format)."
  description      TEXT        NOT NULL,

  -- ── Network context ─────────────────────────────────────────────────────
  -- Required by HIPAA §164.312(b) for access control audit.
  ip_address       TEXT,

  -- ── Outcome ─────────────────────────────────────────────────────────────
  status           TEXT        NOT NULL
    CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
  -- Optional structured error detail for FAILED events (no PHI)
  error_detail     TEXT,

  -- ── Immutable timestamp ─────────────────────────────────────────────────
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Immutability rules ────────────────────────────────────────────────────
-- Block UPDATE and DELETE at the SQL rule level — even service role cannot
-- modify or remove a compliance log entry once written.

CREATE OR REPLACE RULE compliance_audit_logs_no_update
  AS ON UPDATE TO public.compliance_audit_logs
  DO INSTEAD NOTHING;

CREATE OR REPLACE RULE compliance_audit_logs_no_delete
  AS ON DELETE TO public.compliance_audit_logs
  DO INSTEAD NOTHING;

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.compliance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Agency OWNER can read their agency's full compliance trail
CREATE POLICY "cal_owner_read"
  ON public.compliance_audit_logs
  FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- MANAGER and CS can read for oversight and reporting
CREATE POLICY "cal_staff_read"
  ON public.compliance_audit_logs
  FOR SELECT
  USING (
    agency_id IN (
      SELECT b.agency_id FROM public.brokers b
      WHERE b.user_id = auth.uid()
        AND b.role IN ('agency_admin', 'customer_service')
    )
  );

-- INSERT only for agency members via client; service role always bypasses RLS
CREATE POLICY "cal_agency_insert"
  ON public.compliance_audit_logs
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
    )
  );

-- ── Indexes ───────────────────────────────────────────────────────────────

-- Primary compliance report query: agency events in a time range
CREATE INDEX IF NOT EXISTS idx_cal_agency_time
  ON public.compliance_audit_logs(agency_id, created_at DESC);

-- Filter by event type (e.g. "all CRM exports this month")
CREATE INDEX IF NOT EXISTS idx_cal_event_type
  ON public.compliance_audit_logs(event_type, agency_id, created_at DESC);

-- Filter by actor (breach investigation: "all events for broker X")
CREATE INDEX IF NOT EXISTS idx_cal_broker_user
  ON public.compliance_audit_logs(broker_user_id, created_at DESC)
  WHERE broker_user_id IS NOT NULL;

-- Filter FAILED events for operational alerting
CREATE INDEX IF NOT EXISTS idx_cal_failed_events
  ON public.compliance_audit_logs(agency_id, created_at DESC)
  WHERE status = 'FAILED';

-- ── Comments ─────────────────────────────────────────────────────────────

COMMENT ON TABLE public.compliance_audit_logs IS
  'Human-readable CMS/regulator-facing compliance audit trail. '
  'APPEND-ONLY: UPDATE/DELETE blocked by SQL rules. '
  'Complements enterprise_audit_logs (machine-readable HIPAA access log). '
  'PHI FORBIDDEN in all columns — description must contain metadata only.';

COMMENT ON COLUMN public.compliance_audit_logs.description IS
  'Plain-English event summary for compliance officers. '
  'MUST contain only metadata (counts, modes, batch positions). '
  'PHI FORBIDDEN: no names, MBIs, phone numbers, or any ePHI.';

COMMENT ON COLUMN public.compliance_audit_logs.status IS
  'SUCCESS = operation completed as intended. '
  'FAILED  = operation could not complete (see error_detail). '
  'PARTIAL = operation completed but with non-fatal per-record failures '
  '          (e.g. push completed but N contacts failed in GHL).';
