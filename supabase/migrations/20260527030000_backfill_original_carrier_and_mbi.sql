-- ============================================================
-- Backfill original_carrier_name and mbi fields
-- Migration: 20260527030000_backfill_original_carrier_and_mbi
--
-- Purpose:
--   original_carrier_name is the immutable record of what carrier
--   the broker uploaded at roster time. The verify route uses it
--   to detect carrier switches even after the carrier column has
--   been updated by a MARx scan. Without this backfill, all
--   existing members have original_carrier_name = NULL and the
--   comparison falls back to carrier (which may already be stale).
--
--   mbi is queried directly by the verify route for member lookup.
--   For many members it equals member_id (the MBI from the roster).
-- ============================================================

-- 1. Backfill original_carrier_name = carrier for all rows where not yet set
UPDATE public.book_of_business
  SET original_carrier_name = carrier
  WHERE original_carrier_name IS NULL
    AND carrier IS NOT NULL;

-- 2. Backfill mbi = member_id where mbi is null and member_id looks like a valid MBI
--    MBI format: 1C1CC1CC1C1 — 11 characters, alphanumeric, no BILO
UPDATE public.book_of_business
  SET mbi = UPPER(REGEXP_REPLACE(member_id, '[^A-Z0-9]', '', 'g'))
  WHERE mbi IS NULL
    AND member_id IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(member_id, '[^A-Z0-9]', '', 'g')) = 11;

-- 3. Ensure indexes exist for the columns used in verify route lookups
CREATE INDEX IF NOT EXISTS idx_bob_mbi_agency
  ON public.book_of_business(mbi, agency_id)
  WHERE mbi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bob_original_carrier
  ON public.book_of_business(original_carrier_name)
  WHERE original_carrier_name IS NOT NULL;
