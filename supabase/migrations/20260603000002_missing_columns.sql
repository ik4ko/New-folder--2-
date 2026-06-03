/*
 DEPLOYMENT INSTRUCTIONS — run this in Supabase SQL editor before
 or after deploying. Safe to run multiple times due to IF NOT EXISTS.

 After running: re-register to confirm provisionAgency succeeds
 cleanly with all columns populated.

 Context: several migrations were applied locally but not yet pushed
 to the production Supabase project. This consolidated file adds all
 columns that application code references but that may be absent from
 the live database. Every statement is idempotent.
*/

-- ── agencies table ───────────────────────────────────────────────────────────

-- Drives billing-page plan detection and agency dashboard view.
-- Values: 'trial' | 'beta' | 'broker' | 'agency' | 'enterprise'
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS subscription_tier text
    DEFAULT 'broker'
    CHECK (subscription_tier IN ('trial','beta','broker','agency','enterprise'));

-- NULL = unlimited (agency plan); 1 = Solo hard cap.
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS seat_limit integer;

-- Seats included in the base price (1 for Solo, 5 for Agency).
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS included_seats integer
    NOT NULL DEFAULT 1;

-- Billing cycle preference (display only until Stripe subscription is updated).
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS billing_cycle text
    NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','yearly'));

-- Lifecycle status used by AppShell for paused/deleted gating.
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS subscription_status text
    DEFAULT 'active'
    CHECK (subscription_status IN ('active','paused','deleted','trial'));

-- ── brokers table ────────────────────────────────────────────────────────────

-- Extended role values added over time via RBAC and CS-role migrations.
-- The original constraint only allowed ('broker','admin').
-- Drop and replace to support the full set used by application code.
ALTER TABLE public.brokers
  DROP CONSTRAINT IF EXISTS brokers_role_check;

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS role text
    DEFAULT 'solo_broker';

ALTER TABLE public.brokers
  ADD CONSTRAINT brokers_role_check
    CHECK (role IN (
      'agency_owner',
      'agency_admin',
      'customer_service',
      'broker',
      'solo_broker'
    ));
