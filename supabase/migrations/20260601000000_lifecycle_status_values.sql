-- ============================================================
-- Expand agencies.subscription_status CHECK constraint
-- Migration: 20260601000000_lifecycle_status_values
--
-- Root cause:
--   The CHECK constraint added in 20260514040000_beta_and_billing only
--   allows ('trial','active','past_due','cancelled','beta').
--   The billing lifecycle routes write three additional values:
--     'cancel_scheduled' — POST /api/billing/cancel  (cancel_at_period_end = true)
--     'paused'           — POST /api/billing/pause   (pause_collection = void)
--     'deleted'          — POST /api/billing/delete  (immediate soft-delete)
--   All three fail with a CHECK constraint violation, causing the Supabase
--   .update() to return an error and the routes to return 500 / "Failed to
--   update account status".
-- ============================================================

ALTER TABLE public.agencies
  DROP CONSTRAINT IF EXISTS agencies_subscription_status_check;

ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_subscription_status_check
    CHECK (subscription_status IN (
      'trial',
      'active',
      'beta',
      'past_due',
      'cancel_scheduled',
      'paused',
      'cancelled',
      'deleted'
    ));
