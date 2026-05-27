-- ============================================================
-- Beta Hardening: Error Tracking Tables
-- Migration: 20260527000000_beta_hardening_error_tables
-- Purpose:  (1) roster_upload_errors  — persists bad/rejected rows
--           (2) alert_delivery_log    — tracks per-alert notification delivery
--           (3) needs_reverification  — new flag on book_of_business for Marx re-fetch
-- ============================================================

-- ── 1. Roster Upload Errors ─────────────────────────────────────────────────
-- Stores every row that failed validation during a roster upload so that
-- agency owners and brokers can review and correct data without hunting
-- through raw files.

CREATE TABLE IF NOT EXISTS public.roster_upload_errors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id       UUID REFERENCES public.roster_uploads(id) ON DELETE CASCADE,
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  upload_source   TEXT NOT NULL DEFAULT 'roster_upload',  -- 'roster_upload' | 'mbi_upload'
  row_index       INTEGER NOT NULL,                        -- 1-based row number from source file
  reason          TEXT NOT NULL,                           -- human-readable rejection reason
  raw_data        JSONB,                                   -- original row values for display
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: agency members can read their own errors
ALTER TABLE public.roster_upload_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_read_own_errors" ON public.roster_upload_errors
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- Service role can insert (upload handler runs as service client)
CREATE POLICY "service_insert_errors" ON public.roster_upload_errors
  FOR INSERT WITH CHECK (true);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_roster_upload_errors_upload_id
  ON public.roster_upload_errors(upload_id);
CREATE INDEX IF NOT EXISTS idx_roster_upload_errors_agency_id
  ON public.roster_upload_errors(agency_id, created_at DESC);


-- ── 2. Alert Delivery Log ───────────────────────────────────────────────────
-- Tracks every attempt to deliver a switch_alert notification, with status
-- (sent / failed) and error details. Guarantees state-checking — the
-- scheduler can query failed deliveries and retry them independently.

CREATE TABLE IF NOT EXISTS public.alert_delivery_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        UUID REFERENCES public.switch_alerts(id) ON DELETE CASCADE,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'failed', 'skipped')),
  delivery_channel TEXT NOT NULL DEFAULT 'email',          -- 'email' | 'sms' | 'webhook'
  recipient_email TEXT,
  error_message   TEXT,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  retry_count     INTEGER NOT NULL DEFAULT 0
);

-- RLS: readable by agency members through the alert join
ALTER TABLE public.alert_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_read_own_delivery_log" ON public.alert_delivery_log
  FOR SELECT USING (
    alert_id IN (
      SELECT id FROM public.switch_alerts
      WHERE agency_id IN (
        SELECT agency_id FROM public.brokers WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.agencies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "service_insert_delivery_log" ON public.alert_delivery_log
  FOR INSERT WITH CHECK (true);

-- Index for retry-scheduler queries (find failed, unretried deliveries)
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_alert_id
  ON public.alert_delivery_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_failed
  ON public.alert_delivery_log(delivery_status, attempted_at DESC)
  WHERE delivery_status = 'failed';


-- ── 3. Add needs_reverification flag to book_of_business ───────────────────
-- Set by marx/verify when a DB update fails after all retries.
-- A future Marx scan picks up any member with this flag = true and
-- re-attempts verification before clearing the flag.

ALTER TABLE public.book_of_business
  ADD COLUMN IF NOT EXISTS needs_reverification BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bob_needs_reverification
  ON public.book_of_business(needs_reverification)
  WHERE needs_reverification = true;


-- ── 4. Add notification_email column to switch_alerts if missing ────────────
-- Ensures the notified_at stamping from notifyOpenAlerts can record the
-- exact address used, without relying on a separate join.

ALTER TABLE public.switch_alerts
  ADD COLUMN IF NOT EXISTS notification_email TEXT;
