-- Stripe billing: customer ID, subscription tracking, billing events

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS agencies_stripe_customer_idx
  ON agencies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  stripe_event_id   text UNIQUE NOT NULL,
  event_type        text NOT NULL,
  amount_cents      integer,
  currency          text DEFAULT 'usd',
  status            text NOT NULL,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_events_principal ON billing_events
  FOR ALL TO authenticated
  USING (is_principal(agency_id));
