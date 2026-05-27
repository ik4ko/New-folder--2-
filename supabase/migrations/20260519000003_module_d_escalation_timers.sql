CREATE TABLE IF NOT EXISTS escalation_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES switch_alerts(id) ON DELETE CASCADE NOT NULL,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  broker_id uuid REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
  csr_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open',
  escalation_level text NOT NULL DEFAULT 'csr_review',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  notes text
);

CREATE INDEX idx_escalation_timers_expires 
  ON escalation_timers(expires_at) WHERE status = 'open';

ALTER TABLE escalation_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalation_timers_service" ON escalation_timers FOR ALL USING (true) WITH CHECK (true);
