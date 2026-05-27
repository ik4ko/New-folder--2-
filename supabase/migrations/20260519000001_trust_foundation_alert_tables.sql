-- Add confidence fields to existing switch_alerts
ALTER TABLE switch_alerts
  ADD COLUMN IF NOT EXISTS confidence_score 
    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_status text
    DEFAULT 'MONITORING',
  ADD COLUMN IF NOT EXISTS detection_log_id uuid
    REFERENCES member_detection_log(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid
    REFERENCES auth.users(id);

-- False positive tracker
CREATE TABLE IF NOT EXISTS carrier_false_positive_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier text NOT NULL,
  agency_id uuid REFERENCES agencies(id) 
    ON DELETE CASCADE NOT NULL,
  false_positive_count_7d integer DEFAULT 0,
  false_positive_count_30d integer DEFAULT 0,
  total_false_positives integer DEFAULT 0,
  current_alert_threshold integer DEFAULT 70,
  threshold_last_adjusted timestamptz,
  last_false_positive_at timestamptz,
  platform_wide boolean DEFAULT false,
  UNIQUE(carrier, agency_id)
);

ALTER TABLE carrier_false_positive_tracker
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_tracker_service"
  ON carrier_false_positive_tracker FOR ALL
  USING (true) WITH CHECK (true);

-- Detection audit log
CREATE TABLE IF NOT EXISTS detection_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id)
    ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  alert_id uuid,
  broker_id uuid,
  carrier text,
  confidence_before integer,
  confidence_after integer,
  threshold_before integer,
  threshold_after integer,
  false_positive_count_7d integer,
  platform_wide_flag boolean DEFAULT false,
  dom_fingerprint_flagged boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_agency
  ON detection_audit_log(agency_id, created_at DESC);
CREATE INDEX idx_audit_log_event
  ON detection_audit_log(event_type, created_at DESC);

ALTER TABLE detection_audit_log
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_agency_staff"
  ON detection_audit_log FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies 
      WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id FROM brokers
      WHERE user_id = auth.uid()
      AND role IN (
        'agency_owner','agency_admin',
        'customer_service'
      )
    )
  );
CREATE POLICY "audit_log_service_write"
  ON detection_audit_log FOR INSERT
  WITH CHECK (true);
