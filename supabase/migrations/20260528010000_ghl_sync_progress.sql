-- ============================================================
-- GHL sync progress tracking columns
-- Migration: 20260528010000_ghl_sync_progress
--
-- Adds columns to agency_credentials that power the real-time
-- sync progress UI and resumable bulk import cursor.
-- ============================================================

ALTER TABLE public.agency_credentials
  ADD COLUMN IF NOT EXISTS sync_status  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sync_total   INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sync_cursor  TEXT    DEFAULT NULL;

-- last_synced_at from previous migration (20260528000000) — add if missing
ALTER TABLE public.agency_credentials
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill existing connected agencies: treat them as needing a fresh sync
UPDATE public.agency_credentials
  SET sync_status = 'pending'
  WHERE access_token IS NOT NULL
    AND sync_status IS NULL;

COMMENT ON COLUMN public.agency_credentials.sync_status IS
  'Current GHL sync state: pending|running|partial|complete|error';
COMMENT ON COLUMN public.agency_credentials.sync_total IS
  'Total contacts successfully upserted in current or last sync run';
COMMENT ON COLUMN public.agency_credentials.sync_cursor IS
  'GHL startAfter cursor — set when has_more=true so next call resumes here';
