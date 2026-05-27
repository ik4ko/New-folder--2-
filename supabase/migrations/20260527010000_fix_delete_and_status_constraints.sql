-- ============================================================
-- Fix: Member Delete Restriction + Verification Status Enum
-- Migration: 20260527010000_fix_delete_and_status_constraints
--
-- Root causes:
--   1. switch_alerts.bob_member_id FK has no ON DELETE CASCADE
--      → deleting any member with alerts fails with FK violation
--   2. book_of_business.verification_status CHECK constraint
--      only allows ('verified','missing','new','unverified')
--      → marx/verify writes 'termed','pending_switch','aor_lost',
--        'changed' which all violate the constraint and fail silently
-- ============================================================

-- ── 1. Fix switch_alerts FK to cascade on member delete ──────────────────────
-- Drop the bare FK added in 20260518030000 and re-add it with CASCADE so that
-- deleting a book_of_business row also clears its associated alerts.

ALTER TABLE public.switch_alerts
  DROP CONSTRAINT IF EXISTS switch_alerts_bob_member_id_fkey;

ALTER TABLE public.switch_alerts
  ADD CONSTRAINT switch_alerts_bob_member_id_fkey
    FOREIGN KEY (bob_member_id)
    REFERENCES public.book_of_business(id)
    ON DELETE CASCADE;


-- ── 2. Expand verification_status CHECK to include all marx statuses ──────────
-- The original constraint was too narrow.  The full set of valid values is:
--   verified        – currently on expected plan with correct broker
--   missing         – MBI not found in Marx (no MA plan on record)
--   new             – never verified yet
--   unverified      – Marx lookup returned not_found
--   termed          – member has no active MA plan (disenrolled)
--   pending_switch  – future plan change detected (marxResult = pending_switch)
--   aor_lost        – member appears under a different broker (AOR change)
--   changed         – plan or carrier changed from what we had on file
--   baseline_set    – first-time plan code recorded (no prior baseline)

ALTER TABLE public.book_of_business
  DROP CONSTRAINT IF EXISTS book_of_business_verification_status_check;

ALTER TABLE public.book_of_business
  ADD CONSTRAINT book_of_business_verification_status_check
    CHECK (verification_status IN (
      'verified',
      'missing',
      'new',
      'unverified',
      'termed',
      'pending_switch',
      'aor_lost',
      'changed',
      'baseline_set'
    ));


-- ── 3. Backfill any rows that may have slipped through with NULL status ───────
UPDATE public.book_of_business
  SET verification_status = 'unverified'
  WHERE verification_status IS NULL;
