-- ============================================================
-- Seat Enforcement & Subscription Tier Hardening
-- Migration: 20260528080000_seat_enforcement
--
-- Builds on the existing RLS broker isolation in 20260528030000.
-- Adds DB-level seat limit enforcement so the 1-seat Solo Plan
-- restriction is guaranteed at the database layer — not just the UI.
--
-- Architecture:
--   Solo Plan  (broker tier) → seat_limit = 1, hard BLOCK on INSERT
--   Agency Plan (agency tier) → seat_limit = NULL (unlimited), overage
--                                billed via Stripe — no hard block.
--   The trigger enforces the Solo hard cap. Agency overages are handled
--   by the Stripe seat reconciliation engine in the application layer.
--
-- Two new columns on agencies:
--   seat_limit       — NULL = unlimited (agency), 1 = Solo hard cap
--   included_seats   — seats included in base price (1 Solo, 5 Agency)
--   stripe_price_id  — which Stripe price this subscription maps to
--
-- One new column on brokers:
--   is_active        — soft-delete flag; deactivated seats don't count
--                      against the seat limit and lose platform access.
-- ============================================================

-- ── Agencies: add seat and subscription tracking columns ─────────────────────

ALTER TABLE public.agencies
  -- NULL means unlimited (agency tier); 1 enforces Solo single-seat cap
  ADD COLUMN IF NOT EXISTS seat_limit        INTEGER   DEFAULT 1,
  -- Seats included in the base subscription price before overage
  ADD COLUMN IF NOT EXISTS included_seats    INTEGER   DEFAULT 1,
  -- Stripe Price ID that created/last updated this subscription
  -- Used by the webhook to update tier and seat limits atomically
  ADD COLUMN IF NOT EXISTS stripe_price_id   TEXT,
  -- ISO timestamp of when the subscription was created in Stripe
  ADD COLUMN IF NOT EXISTS subscribed_at     TIMESTAMPTZ;

COMMENT ON COLUMN public.agencies.seat_limit IS
  'Maximum active broker seats allowed. NULL = unlimited (Agency Plan). '
  '1 = Solo Broker Plan hard cap enforced by DB trigger.';

COMMENT ON COLUMN public.agencies.included_seats IS
  'Broker seats included in the base subscription price before overage billing. '
  'Solo Plan: 1. Agency Plan: 5.';

COMMENT ON COLUMN public.agencies.stripe_price_id IS
  'Stripe Price ID of the active subscription plan. Used to map to tier rules.';

-- Backfill existing rows so they default to Solo constraints until
-- their subscription is confirmed via webhook.
UPDATE public.agencies
  SET seat_limit     = 1,
      included_seats = 1
  WHERE seat_limit IS NULL;

-- ── Brokers: add is_active soft-delete flag ────────────────────────────────

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.brokers.is_active IS
  'FALSE = broker seat deactivated. Does not count against seat_limit. '
  'Deactivated brokers lose platform access but their data is preserved.';

CREATE INDEX IF NOT EXISTS idx_brokers_agency_active
  ON public.brokers(agency_id, is_active)
  WHERE is_active = TRUE;

-- ── Helper: count active broker seats for an agency ──────────────────────────

CREATE OR REPLACE FUNCTION public.get_active_seat_count(p_agency_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.brokers
  WHERE agency_id = p_agency_id
    AND is_active  = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Trigger function: enforce seat limit before broker INSERT ─────────────────
-- Only fires when seat_limit IS NOT NULL (i.e. Solo Plan).
-- Agency Plan rows have seat_limit = NULL and are NOT blocked here —
-- they're metered and billed via Stripe overage.

CREATE OR REPLACE FUNCTION public.enforce_broker_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_seat_limit     INTEGER;
  v_active_count   INTEGER;
  v_tier           TEXT;
BEGIN
  -- Read the agency's seat limit and tier in one query
  SELECT seat_limit, subscription_tier
  INTO   v_seat_limit, v_tier
  FROM   public.agencies
  WHERE  id = NEW.agency_id;

  -- NULL seat_limit = Agency Plan (unlimited/metered) — allow INSERT
  IF v_seat_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current active seats
  v_active_count := public.get_active_seat_count(NEW.agency_id);

  IF v_active_count >= v_seat_limit THEN
    RAISE EXCEPTION
      'SEAT_LIMIT_EXCEEDED: agency % has reached its % seat limit (% of % used). '
      'Upgrade to the Agency Plan to add additional brokers.',
      NEW.agency_id,
      COALESCE(v_tier, 'broker'),
      v_active_count,
      v_seat_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate to ensure idempotency
DROP TRIGGER IF EXISTS trg_enforce_seat_limit ON public.brokers;

CREATE TRIGGER trg_enforce_seat_limit
  BEFORE INSERT ON public.brokers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_broker_seat_limit();

-- ── Helper: compute Stripe overage quantity for an agency ────────────────────
-- Returns how many seats are ABOVE the included_seats baseline.
-- Used by the Stripe seat reconciliation engine.

CREATE OR REPLACE FUNCTION public.get_seat_overage(p_agency_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_active_count   INTEGER;
  v_included_seats INTEGER;
BEGIN
  SELECT included_seats INTO v_included_seats
  FROM   public.agencies
  WHERE  id = p_agency_id;

  v_active_count := public.get_active_seat_count(p_agency_id);

  RETURN GREATEST(0, v_active_count - COALESCE(v_included_seats, 1));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── RLS: restrict deactivated brokers from reading data ───────────────────────
-- Deactivated brokers (is_active = FALSE) should not be able to query
-- any data even if their JWT is still valid. We enforce this by adding
-- an is_active check to the brokers_own_row policy.

DROP POLICY IF EXISTS "brokers_own_row" ON public.brokers;

CREATE POLICY "brokers_own_row"
  ON public.brokers
  FOR ALL
  USING (user_id = auth.uid() AND is_active = TRUE);

-- Owners can still see deactivated brokers (for management/re-activation)
DROP POLICY IF EXISTS "brokers_agency_owner_sees_all" ON public.brokers;

CREATE POLICY "brokers_agency_owner_sees_all"
  ON public.brokers
  FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agencies_stripe_price_id
  ON public.agencies(stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agencies_subscription_tier_status
  ON public.agencies(subscription_tier, subscription_status);

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON FUNCTION public.enforce_broker_seat_limit() IS
  'Trigger: blocks INSERT on brokers table when agency seat_limit is reached. '
  'Raises SEAT_LIMIT_EXCEEDED (P0001) with actionable upgrade message. '
  'Agency Plan agencies have seat_limit = NULL and are never blocked here.';

COMMENT ON FUNCTION public.get_seat_overage(UUID) IS
  'Returns the number of active broker seats above included_seats baseline. '
  'Used by the Stripe seat reconciliation engine to calculate overage billing.';
