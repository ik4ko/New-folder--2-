-- ============================================================
-- Fix: switch_alerts schema for Marx extension compatibility
-- Migration: 20260527020000_fix_switch_alerts_schema
--
-- Root causes:
--   1. ghl_contact_id TEXT NOT NULL — Marx alerts have no GHL contact,
--      so every insert from the extension fails with NOT NULL violation
--   2. alert_type CHECK only allows legacy roster upload types;
--      Marx types ('termed','pending_switch','aor_change','plan_switch',
--      'carrier_switch') all violate the constraint
--   3. Missing columns: switch_type, detection_source, effective_date,
--      detected_at, bob_member_id already added in 20260518030000
--      but switch_type / detection_source / effective_date / detected_at
--      were referenced in code without existing in the schema
-- ============================================================

-- ── 1. Make ghl_contact_id nullable ──────────────────────────────────────────
ALTER TABLE public.switch_alerts
  ALTER COLUMN ghl_contact_id DROP NOT NULL;

-- ── 2. Expand alert_type CHECK ───────────────────────────────────────────────
ALTER TABLE public.switch_alerts
  DROP CONSTRAINT IF EXISTS switch_alerts_alert_type_check;

ALTER TABLE public.switch_alerts
  ADD CONSTRAINT switch_alerts_alert_type_check
    CHECK (alert_type IN (
      -- Legacy roster-upload types
      'missing_from_roster',
      'plan_change_detected',
      'new_enrollment',
      'status_change',
      -- Marx extension types
      'termed',
      'pending_switch',
      'aor_change',
      'plan_switch',
      'carrier_switch'
    ));

-- ── 3. Add missing columns if not present ────────────────────────────────────
ALTER TABLE public.switch_alerts
  ADD COLUMN IF NOT EXISTS switch_type       TEXT,
  ADD COLUMN IF NOT EXISTS detection_source  TEXT DEFAULT 'roster_upload',
  ADD COLUMN IF NOT EXISTS effective_date    DATE,
  ADD COLUMN IF NOT EXISTS detected_at       TIMESTAMPTZ DEFAULT now();

-- ── 4. Index for Marx-sourced alerts dashboard query ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_switch_alerts_bob_member
  ON public.switch_alerts(bob_member_id)
  WHERE bob_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_switch_alerts_agency_status
  ON public.switch_alerts(agency_id, status, detected_at DESC);
