-- ============================================================
-- TENANT ISOLATION REPAIR + ROSTER DEDUPLICATION
-- Migration: 20260529000001_tenant_isolation_repair
--
-- Root cause (scripts/seed_test_data.sql):
--   ika9191@gmail.com (independent broker) and ikan9191@gmail.com
--   (agency owner) were both hard-coded to agency_id
--   'd59ad7d4-aaea-4831-91d8-60ac30c84d2a'. Every downstream row
--   (book_of_business, switch_alerts, vcc_submissions, ghl_contacts)
--   inherited that shared agency_id, causing cross-tenant bleed visible
--   in the manager dashboard and member list.
--
-- This migration:
--   1. Creates an isolated solo-broker agency for ika9191@gmail.com
--   2. Rebinds their broker row and ALL downstream data to the new agency
--   3. Purges duplicate book_of_business rows (mbi-keyed and name-keyed)
--   4. Verifies post-migration state via RAISE NOTICE
--
-- SAFETY:
--   Wrapped in a single BEGIN/COMMIT transaction.
--   On any error the entire block rolls back — no partial state.
--   All mutations are guarded by existence checks so the script is
--   idempotent: re-running after a successful migration is a no-op.
--
-- HOW TO RUN:
--   Paste into Supabase SQL Editor → Run.
--   Review NOTICE lines in the output panel to confirm each step.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Diagnostic — log current state before touching anything
-- ============================================================

DO $$
DECLARE
  v_owner_uid        UUID;
  v_broker_uid       UUID;
  v_owner_agency_id  UUID;
  v_broker_row_id    UUID;
  v_broker_agency_id UUID;
  v_bob_count        INTEGER;
  v_alert_count      INTEGER;
BEGIN
  SELECT id INTO v_owner_uid  FROM auth.users WHERE email = 'ikan9191@gmail.com';
  SELECT id INTO v_broker_uid FROM auth.users WHERE email = 'ika9191@gmail.com';

  IF v_owner_uid IS NULL THEN
    RAISE WARNING 'DIAG: ikan9191@gmail.com not found in auth.users — check spelling';
  END IF;
  IF v_broker_uid IS NULL THEN
    RAISE WARNING 'DIAG: ika9191@gmail.com not found in auth.users — check spelling';
  END IF;

  SELECT id INTO v_owner_agency_id
    FROM public.agencies
    WHERE owner_id = v_owner_uid;

  SELECT id, agency_id
    INTO v_broker_row_id, v_broker_agency_id
    FROM public.brokers
    WHERE user_id = v_broker_uid
    ORDER BY created_at ASC
    LIMIT 1;

  SELECT COUNT(*) INTO v_bob_count
    FROM public.book_of_business
    WHERE broker_id = v_broker_row_id;

  SELECT COUNT(*) INTO v_alert_count
    FROM public.switch_alerts
    WHERE broker_id = v_broker_row_id;

  RAISE NOTICE '── PRE-MIGRATION STATE ──────────────────────────────────';
  RAISE NOTICE 'Owner (ikan9191) auth uid  : %', v_owner_uid;
  RAISE NOTICE 'Broker (ika9191) auth uid  : %', v_broker_uid;
  RAISE NOTICE 'Owner agency_id            : %', v_owner_agency_id;
  RAISE NOTICE 'Broker row id              : %', v_broker_row_id;
  RAISE NOTICE 'Broker current agency_id   : %', v_broker_agency_id;
  RAISE NOTICE 'Broker BOB record count    : %', v_bob_count;
  RAISE NOTICE 'Broker alert count         : %', v_alert_count;
  RAISE NOTICE 'Shared agency contaminated : %',
    (v_broker_agency_id IS NOT DISTINCT FROM v_owner_agency_id);
  RAISE NOTICE '────────────────────────────────────────────────────────';
END;
$$;

-- ============================================================
-- STEP 2: Tenant isolation — isolate ika9191@gmail.com
-- ============================================================

DO $$
DECLARE
  v_owner_uid        UUID;
  v_broker_uid       UUID;
  v_owner_agency_id  UUID;
  v_broker_row_id    UUID;
  v_broker_agency_id UUID;
  v_new_agency_id    UUID;

  v_bob_moved     INTEGER := 0;
  v_alerts_moved  INTEGER := 0;
  v_vcc_moved     INTEGER := 0;
  v_aor_moved     INTEGER := 0;
  v_camp_moved    INTEGER := 0;
  v_ghl_moved     INTEGER := 0;
BEGIN
  -- ── Resolve auth user IDs ─────────────────────────────────────────────────
  SELECT id INTO v_owner_uid
    FROM auth.users WHERE email = 'ikan9191@gmail.com';
  SELECT id INTO v_broker_uid
    FROM auth.users WHERE email = 'ika9191@gmail.com';

  IF v_owner_uid IS NULL OR v_broker_uid IS NULL THEN
    RAISE EXCEPTION
      'Cannot resolve one or both user accounts. Aborting to prevent data loss.';
  END IF;

  -- ── Resolve existing agency/broker rows ───────────────────────────────────
  SELECT id INTO v_owner_agency_id
    FROM public.agencies
    WHERE owner_id = v_owner_uid;

  SELECT id, agency_id
    INTO v_broker_row_id, v_broker_agency_id
    FROM public.brokers
    WHERE user_id = v_broker_uid
    ORDER BY created_at ASC
    LIMIT 1;

  -- ── Guard: already isolated? ──────────────────────────────────────────────
  IF v_broker_agency_id IS DISTINCT FROM v_owner_agency_id THEN
    RAISE NOTICE 'STEP 2: ika9191 already isolated (agency_id != owner agency_id). Skipping.';
    RETURN;
  END IF;

  IF v_broker_row_id IS NULL THEN
    RAISE NOTICE 'STEP 2: No broker row found for ika9191. Nothing to isolate.';
    RETURN;
  END IF;

  -- ── Create new solo agency for ika9191 ────────────────────────────────────
  -- Check if they already own an agency (idempotency guard)
  SELECT id INTO v_new_agency_id
    FROM public.agencies
    WHERE owner_id = v_broker_uid;

  IF v_new_agency_id IS NULL THEN
    INSERT INTO public.agencies (
      name,
      owner_id,
      status,
      subscription_tier,
      subscription_status,
      seat_limit,
      included_seats
    ) VALUES (
      'Solo Broker Account',     -- human-readable placeholder; owner can rename
      v_broker_uid,
      'active',
      'broker',                  -- solo broker tier
      'active',
      1,                         -- hard 1-seat cap for solo plan
      1
    )
    RETURNING id INTO v_new_agency_id;

    RAISE NOTICE 'STEP 2: Created new isolated agency % for ika9191', v_new_agency_id;
  ELSE
    RAISE NOTICE 'STEP 2: ika9191 already owns agency %. Rebinding data only.', v_new_agency_id;
  END IF;

  -- ── Rebind broker row ─────────────────────────────────────────────────────
  UPDATE public.brokers
    SET agency_id = v_new_agency_id
    WHERE id = v_broker_row_id;

  RAISE NOTICE 'STEP 2: Rebound broker row % to new agency', v_broker_row_id;

  -- ── Rebind book_of_business ───────────────────────────────────────────────
  -- NOTE: UNIQUE(mbi, agency_id) constraint exists (20260528060000).
  -- Safe to UPDATE because v_new_agency_id is freshly created — no existing
  -- rows in new agency can collide with these MBIs.
  UPDATE public.book_of_business
    SET agency_id = v_new_agency_id
    WHERE broker_id = v_broker_row_id
      AND agency_id = v_owner_agency_id;
  GET DIAGNOSTICS v_bob_moved = ROW_COUNT;

  -- ── Rebind switch_alerts ──────────────────────────────────────────────────
  UPDATE public.switch_alerts
    SET agency_id = v_new_agency_id
    WHERE broker_id = v_broker_row_id
      AND agency_id = v_owner_agency_id;
  GET DIAGNOSTICS v_alerts_moved = ROW_COUNT;

  -- ── Rebind vcc_submissions ────────────────────────────────────────────────
  UPDATE public.vcc_submissions
    SET agency_id = v_new_agency_id
    WHERE broker_id = v_broker_row_id
      AND agency_id = v_owner_agency_id;
  GET DIAGNOSTICS v_vcc_moved = ROW_COUNT;

  -- ── Rebind aor_submissions ────────────────────────────────────────────────
  UPDATE public.aor_submissions
    SET agency_id = v_new_agency_id
    WHERE broker_id = v_broker_row_id
      AND agency_id = v_owner_agency_id;
  GET DIAGNOSTICS v_aor_moved = ROW_COUNT;

  -- ── Rebind campaign_enrollments ───────────────────────────────────────────
  UPDATE public.campaign_enrollments
    SET agency_id = v_new_agency_id
    WHERE broker_id = v_broker_row_id
      AND agency_id = v_owner_agency_id;
  GET DIAGNOSTICS v_camp_moved = ROW_COUNT;

  -- ── Rebind ghl_contacts assigned to ika9191 ──────────────────────────────
  -- ghl_contacts.assigned_broker_id references auth.users(id) directly,
  -- not brokers(id), so we key on v_broker_uid here.
  UPDATE public.ghl_contacts
    SET agency_id = v_new_agency_id
    WHERE assigned_broker_id = v_broker_uid
      AND agency_id = v_owner_agency_id;
  GET DIAGNOSTICS v_ghl_moved = ROW_COUNT;

  -- ── Rebind roster_upload_errors (best-effort, non-fatal) ─────────────────
  BEGIN
    UPDATE public.roster_upload_errors
      SET agency_id = v_new_agency_id
      WHERE agency_id = v_owner_agency_id
        AND EXISTS (
          SELECT 1 FROM public.book_of_business bob
          WHERE bob.agency_id = v_new_agency_id
            AND bob.broker_id = v_broker_row_id
        );
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'STEP 2: roster_upload_errors table does not exist — skipped.';
  END;

  RAISE NOTICE '── STEP 2 COMPLETE ──────────────────────────────────────';
  RAISE NOTICE 'New isolated agency_id : %', v_new_agency_id;
  RAISE NOTICE 'book_of_business moved : %', v_bob_moved;
  RAISE NOTICE 'switch_alerts moved    : %', v_alerts_moved;
  RAISE NOTICE 'vcc_submissions moved  : %', v_vcc_moved;
  RAISE NOTICE 'aor_submissions moved  : %', v_aor_moved;
  RAISE NOTICE 'campaign_enrollments   : %', v_camp_moved;
  RAISE NOTICE 'ghl_contacts moved     : %', v_ghl_moved;
  RAISE NOTICE '────────────────────────────────────────────────────────';
END;
$$;

-- ============================================================
-- STEP 3: Roster deduplication
--
-- Pass A: Rows WITH MBI — partition on (mbi, agency_id).
--   The UNIQUE constraint from 20260528060000 already prevents NEW
--   duplicates, but rows loaded before that migration may still exist.
--
-- Pass B: Rows WITHOUT MBI — partition on
--   (lower(full_name), lower(plan_name), agency_id).
--   These rows cannot use the mbi constraint path; dedup by name+plan.
--
-- In both passes: keep the row with the most recent
--   COALESCE(updated_at, created_at), breaking ties on higher UUID.
-- ============================================================

-- ── Pass A: MBI-keyed dedup ───────────────────────────────────────────────────
DO $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.book_of_business
  WHERE id IN (
    SELECT id FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY mbi, agency_id
          ORDER BY
            COALESCE(updated_at, created_at) DESC NULLS LAST,
            id DESC           -- deterministic tie-breaker
        ) AS rn
      FROM public.book_of_business
      WHERE mbi        IS NOT NULL
        AND mbi        <> ''
        AND agency_id  IS NOT NULL
    ) ranked
    WHERE rn > 1
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'STEP 3A: Deleted % duplicate rows (MBI-keyed)', v_deleted;
END;
$$;

-- ── Pass B: Name+Plan keyed dedup (NULL-mbi rows) ────────────────────────────
DO $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.book_of_business
  WHERE id IN (
    SELECT id FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY
            lower(trim(full_name)),
            lower(trim(coalesce(plan_name, ''))),
            agency_id
          ORDER BY
            COALESCE(updated_at, created_at) DESC NULLS LAST,
            id DESC
        ) AS rn
      FROM public.book_of_business
      WHERE (mbi IS NULL OR mbi = '')
        AND full_name  IS NOT NULL
        AND agency_id  IS NOT NULL
    ) ranked
    WHERE rn > 1
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'STEP 3B: Deleted % duplicate rows (name+plan keyed, null-MBI)', v_deleted;
END;
$$;

-- ============================================================
-- STEP 4: Post-migration verification
-- Confirm the two accounts are now in separate agencies and
-- that no (mbi, agency_id) duplicates remain.
-- ============================================================

DO $$
DECLARE
  v_owner_uid         UUID;
  v_broker_uid        UUID;
  v_owner_agency_id   UUID;
  v_broker_agency_id  UUID;
  v_remaining_dups    INTEGER;
  v_owner_bob_count   INTEGER;
  v_broker_bob_count  INTEGER;
BEGIN
  SELECT id INTO v_owner_uid  FROM auth.users WHERE email = 'ikan9191@gmail.com';
  SELECT id INTO v_broker_uid FROM auth.users WHERE email = 'ika9191@gmail.com';

  SELECT id INTO v_owner_agency_id
    FROM public.agencies WHERE owner_id = v_owner_uid;

  SELECT ag.id INTO v_broker_agency_id
    FROM public.brokers b
    JOIN public.agencies ag ON ag.id = b.agency_id
    WHERE b.user_id = v_broker_uid
    ORDER BY b.created_at ASC LIMIT 1;

  SELECT COUNT(*) INTO v_owner_bob_count
    FROM public.book_of_business
    WHERE agency_id = v_owner_agency_id;

  SELECT COUNT(*) INTO v_broker_bob_count
    FROM public.book_of_business
    WHERE agency_id = v_broker_agency_id;

  -- Count any remaining (mbi, agency_id) duplicates
  SELECT COUNT(*) INTO v_remaining_dups FROM (
    SELECT mbi, agency_id, COUNT(*) AS cnt
    FROM public.book_of_business
    WHERE mbi IS NOT NULL AND mbi <> ''
    GROUP BY mbi, agency_id
    HAVING COUNT(*) > 1
  ) dups;

  RAISE NOTICE '── POST-MIGRATION VERIFICATION ──────────────────────────';
  RAISE NOTICE 'Owner agency_id  : %', v_owner_agency_id;
  RAISE NOTICE 'Broker agency_id : %', v_broker_agency_id;
  RAISE NOTICE 'Accounts isolated: %',
    (v_owner_agency_id IS DISTINCT FROM v_broker_agency_id);
  RAISE NOTICE 'Owner BOB rows   : %', v_owner_bob_count;
  RAISE NOTICE 'Broker BOB rows  : %', v_broker_bob_count;
  RAISE NOTICE 'Remaining dups   : % (should be 0)', v_remaining_dups;

  IF v_owner_agency_id IS NOT DISTINCT FROM v_broker_agency_id THEN
    RAISE EXCEPTION
      'VERIFICATION FAILED: accounts still share the same agency_id. Rolling back.';
  END IF;
  IF v_remaining_dups > 0 THEN
    RAISE WARNING 'WARNING: % (mbi, agency_id) duplicate groups still exist after dedup. '
      'These may be rows where mbi contains whitespace or inconsistent casing. '
      'Run the diagnostic query below to investigate.',
      v_remaining_dups;
  END IF;

  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration 20260529000001 completed successfully.';
END;
$$;

COMMIT;

-- ============================================================
-- DIAGNOSTIC QUERIES — run separately AFTER the migration to
-- confirm live state in the Supabase Table Editor.
-- These are SELECT-only and safe to run at any time.
-- ============================================================

/*
-- 1. Confirm account separation
SELECT
  au.email,
  ag.id        AS agency_id,
  ag.name      AS agency_name,
  ag.subscription_tier,
  b.role,
  b.is_active
FROM auth.users au
JOIN public.brokers   b  ON b.user_id   = au.id
JOIN public.agencies  ag ON ag.id       = b.agency_id
WHERE au.email IN ('ikan9191@gmail.com', 'ika9191@gmail.com')
ORDER BY au.email;

-- 2. Confirm no shared agency_id
SELECT
  a.owner_id,
  au.email,
  a.id AS agency_id,
  (SELECT COUNT(*) FROM public.brokers WHERE agency_id = a.id) AS broker_count,
  (SELECT COUNT(*) FROM public.book_of_business WHERE agency_id = a.id) AS bob_count
FROM public.agencies a
JOIN auth.users au ON au.id = a.owner_id
WHERE au.email IN ('ikan9191@gmail.com', 'ika9191@gmail.com');

-- 3. Remaining duplicates check
SELECT mbi, agency_id, COUNT(*) AS cnt
FROM public.book_of_business
WHERE mbi IS NOT NULL AND mbi <> ''
GROUP BY mbi, agency_id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 4. Name+plan duplicates (null-MBI rows)
SELECT
  lower(trim(full_name))              AS name_key,
  lower(trim(coalesce(plan_name,''))) AS plan_key,
  agency_id,
  COUNT(*)                            AS cnt
FROM public.book_of_business
WHERE (mbi IS NULL OR mbi = '')
  AND full_name IS NOT NULL
GROUP BY 1, 2, agency_id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
*/
