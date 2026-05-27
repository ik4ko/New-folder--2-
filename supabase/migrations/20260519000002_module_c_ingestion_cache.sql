CREATE TABLE IF NOT EXISTS carrier_schema_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier text NOT NULL,
  dom_fingerprint text NOT NULL,
  schema_mapping jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(carrier, dom_fingerprint)
);

CREATE INDEX idx_carrier_schema_maps_fingerprint 
  ON carrier_schema_maps(carrier, dom_fingerprint);

ALTER TABLE carrier_schema_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carrier_schema_maps_service" ON carrier_schema_maps FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS carrier_schema_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id uuid REFERENCES carrier_schema_maps(id) ON DELETE CASCADE,
  carrier text NOT NULL,
  previous_fingerprint text,
  new_fingerprint text,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE carrier_schema_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carrier_schema_history_service" ON carrier_schema_history FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS background_job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error_details text
);

ALTER TABLE background_job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "background_job_queue_service" ON background_job_queue FOR ALL USING (true) WITH CHECK (true);
