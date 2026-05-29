-- ============================================================
-- book_of_business: UNIQUE(mbi, agency_id) constraint
-- Migration: 20260528060000_bob_mbi_agency_unique
--
-- Root problem:
--   Both /api/roster/upload and /api/roster/sheets-import call:
--     .upsert(records, { onConflict: 'mbi,agency_id' })
--   Supabase upsert with onConflict requires a UNIQUE constraint (or unique
--   index) on exactly those columns. Without it, the upsert cannot detect
--   a conflict and falls back to a plain INSERT — meaning every re-import
--   of the same roster or Google Sheet creates duplicate rows for the same
--   member rather than updating the existing record.
--
-- Fix:
--   Add a UNIQUE constraint on (mbi, agency_id) so that:
--     1. Re-importing the same roster merges (updates) existing records
--     2. Two different brokers in the same agency cannot have duplicate MBI rows
--     3. The onConflict upsert path works correctly in both import routes
--
-- Existing constraint preserved:
--   UNIQUE(broker_id, carrier, member_id) — from 20260518030000_book_of_business.sql
--   This constraint remains untouched. It serves a different purpose: preventing
--   the same broker from uploading the same carrier+member_id combination twice.
--   Both constraints coexist without conflict.
--
-- Duplicate handling:
--   If duplicate (mbi, agency_id) rows already exist in the live DB (from
--   imports prior to this migration), the constraint addition will FAIL with
--   a unique violation. The DO block below detects and deduplicates those rows
--   first by keeping the most recently updated record for each (mbi, agency_id)
--   pair and deleting the older duplicates before adding the constraint.
--
-- Safety:
--   All operations are wrapped in a single transaction. If any step fails,
--   the entire migration rolls back — no partial state.
--
-- HIPAA note:
--   MBI values in this table are stored in plaintext for roster matching.
--   The encrypted copy lives in ghl_contacts.mbi_enc. Access to this column
--   is governed by the broker-isolated RLS policies in migration 20260528030000.
-- ============================================================

BEGIN;

-- ── Step 1: Deduplicate existing rows ────────────────────────────────────────
-- Remove older duplicate (mbi, agency_id) pairs, keeping the row with the
-- most recent updated_at. If updated_at is tied, keep the row with the
-- higher UUID (arbitrary but deterministic).
--
-- This DELETE is a no-op on a fresh database. On a live database with
-- duplicates introduced by pre-fix imports, it removes the stale rows.
-- The newer row (most recently updated) is considered authoritative.

DELETE FROM public.book_of_business
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY mbi, agency_id
        ORDER BY
          updated_at DESC NULLS LAST,
          id DESC              -- tie-breaker: higher UUID wins
      ) AS rn
    FROM public.book_of_business
    WHERE mbi IS NOT NULL
      AND agency_id IS NOT NULL
  ) ranked
  WHERE rn > 1  -- delete all but the "winner" row per (mbi, agency_id) pair
);

-- ── Step 2: Add the UNIQUE constraint ────────────────────────────────────────
-- Using ADD CONSTRAINT ... UNIQUE rather than CREATE UNIQUE INDEX because:
--   a) Supabase upsert's onConflict resolution uses named constraints
--   b) The constraint is named explicitly so it can be referenced in error messages
--      and dropped by name in a future migration if the data model changes

ALTER TABLE public.book_of_business
  ADD CONSTRAINT bob_mbi_agency_unique UNIQUE (mbi, agency_id);

-- ── Step 3: Supporting index (query performance) ──────────────────────────────
-- The UNIQUE constraint above creates an implicit unique index, but an explicit
-- partial index on non-null MBIs accelerates the common lookup pattern used
-- by the verify route and MARx check: WHERE mbi = $1 AND agency_id = $2

CREATE INDEX IF NOT EXISTS idx_bob_mbi_agency_lookup
  ON public.book_of_business (mbi, agency_id)
  WHERE mbi IS NOT NULL;

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON CONSTRAINT bob_mbi_agency_unique ON public.book_of_business IS
  'Ensures each Medicare Beneficiary Identifier (MBI) appears only once per agency. '
  'Required by /api/roster/upload and /api/roster/sheets-import upsert onConflict '
  'path so re-importing the same roster merges records instead of creating duplicates.';

COMMIT;
