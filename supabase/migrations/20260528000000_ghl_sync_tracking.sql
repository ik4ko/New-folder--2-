-- ============================================================
-- Add last_synced_at to agency_credentials
-- Migration: 20260528000000_ghl_sync_tracking
--
-- Purpose:
--   Tracks the timestamp of the last successful GHL contact sync.
--   The /api/ghl/sync route uses this to pull only contacts
--   added/updated since the last import (incremental sync),
--   so brokers can add new GHL contacts without re-importing
--   their entire book.
-- ============================================================

ALTER TABLE public.agency_credentials
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NULL;

-- Back-fill: treat existing rows as synced at the time of last update
-- so the next incremental sync correctly fetches only NEW contacts.
UPDATE public.agency_credentials
  SET last_synced_at = updated_at
  WHERE last_synced_at IS NULL
    AND updated_at IS NOT NULL;

COMMENT ON COLUMN public.agency_credentials.last_synced_at IS
  'Timestamp of last successful GHL contact sync. Used by /api/ghl/sync for incremental import.';
