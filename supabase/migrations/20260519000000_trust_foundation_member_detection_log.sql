CREATE TABLE IF NOT EXISTS member_detection_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) 
    ON DELETE CASCADE NOT NULL,
  broker_id uuid REFERENCES brokers(id) 
    ON DELETE CASCADE NOT NULL,
  bob_member_id uuid REFERENCES book_of_business(id)
    ON DELETE CASCADE NOT NULL,
  switch_alert_id uuid REFERENCES switch_alerts(id)
    ON DELETE SET NULL,
  carrier text NOT NULL,
  
  confidence_score integer DEFAULT 0
    CHECK (confidence_score >= 0 
      AND confidence_score <= 100),
  score_components jsonb DEFAULT '{
    "initial_scrape": 0,
    "second_consecutive": 0,
    "third_consecutive": 0,
    "commission_match": 0,
    "marx_lookup": 0,
    "decay_applied": 0
  }'::jsonb,
  
  consecutive_missing_count integer DEFAULT 0,
  first_detected_at timestamptz,
  last_confirmed_missing_at timestamptz,
  last_seen_on_roster_at timestamptz,
  alert_triggered_at timestamptz,
  alert_threshold_at_trigger integer,
  
  current_status text NOT NULL DEFAULT 'MONITORING'
    CHECK (current_status IN (
      'MONITORING',
      'WATCHLIST', 
      'PENDING',
      'ALERT_SENT',
      'HIGH_CONFIDENCE',
      'CONFIRMED',
      'RESOLVED_FALSE_POSITIVE',
      'RESOLVED_CONFIRMED_SWITCH'
    )),
  
  UNIQUE(broker_id, carrier, bob_member_id)
);

CREATE INDEX idx_detection_log_member
  ON member_detection_log(bob_member_id);
CREATE INDEX idx_detection_log_broker_carrier
  ON member_detection_log(broker_id, carrier);
CREATE INDEX idx_detection_log_status
  ON member_detection_log(current_status)
  WHERE current_status NOT IN (
    'RESOLVED_FALSE_POSITIVE',
    'RESOLVED_CONFIRMED_SWITCH'
  );

ALTER TABLE member_detection_log 
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detection_log_broker_own"
  ON member_detection_log FOR SELECT
  USING (
    broker_id IN (
      SELECT id FROM brokers 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "detection_log_agency_staff"
  ON member_detection_log FOR SELECT
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

CREATE POLICY "detection_log_service_write"
  ON member_detection_log FOR ALL
  USING (true) WITH CHECK (true);
