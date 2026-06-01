-- ============================================================
-- Add fax retry tracking columns to vcc_submissions
-- Migration: 20260601020000_vcc_fax_retry_columns
--
-- Required by the SRFax webhook receiver (/api/vcc/fax-status).
-- Without these columns the webhook cannot track retry attempts
-- or store the last error message from SRFax delivery callbacks.
--
-- fax_attempts  — incremented by the webhook on each failed delivery.
--                 The webhook retries up to MAX_FAX_RETRIES (3) times.
--                 A value of 0 means the fax has never been attempted.
--
-- fax_last_error — last SRFax status string or error message recorded
--                  by the webhook. Stored for broker-facing diagnostics
--                  and support triage. Never contains PHI.
-- ============================================================

ALTER TABLE public.vcc_submissions
  ADD COLUMN IF NOT EXISTS fax_attempts  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fax_last_error TEXT;

COMMENT ON COLUMN public.vcc_submissions.fax_attempts IS
  'Number of fax delivery attempts made. Incremented by the /api/vcc/fax-status webhook on each failure.';

COMMENT ON COLUMN public.vcc_submissions.fax_last_error IS
  'Last SRFax status code or error message. Populated by the webhook receiver. No PHI.';

-- Index to support the webhook receiver''s fax_confirmation_id lookup.
-- The webhook fires after every fax attempt and does a point-lookup
-- on this column; without an index each callback scans the full table.
CREATE INDEX IF NOT EXISTS idx_vcc_submissions_fax_confirmation_id
  ON public.vcc_submissions(fax_confirmation_id)
  WHERE fax_confirmation_id IS NOT NULL;
