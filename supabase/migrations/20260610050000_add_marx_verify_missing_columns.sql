-- The MARx verify route selects enrollment_confirmed in BOB_SELECT and writes
-- detection_status, detection_status_updated_at, enrollment_confirmed,
-- enrollment_confirmed_at in its update payload — but none of these columns
-- existed in book_of_business. PostgREST rejects the entire SELECT when it
-- names a missing column, so EVERY member lookup failed → 404 on every verify
-- call (same failure class as the dropped plaintext mbi column), even after
-- the mbi-select fix deployed. No alerts/emails could ever be produced.
-- (Applied to production 2026-06-10 via MCP as add_marx_verify_missing_columns.)
ALTER TABLE public.book_of_business
  ADD COLUMN IF NOT EXISTS enrollment_confirmed        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrollment_confirmed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS detection_status            text,
  ADD COLUMN IF NOT EXISTS detection_status_updated_at timestamptz;
