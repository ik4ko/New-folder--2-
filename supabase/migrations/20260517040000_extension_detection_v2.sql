-- Extension detection v2: track how each alert was created and when.

ALTER TABLE switch_alerts
  ADD COLUMN IF NOT EXISTS detection_source text
    DEFAULT 'roster_upload'
    CHECK (detection_source IN (
      'extension_sync',
      'extension_auto',
      'roster_upload',
      'manual_flag'
    )),
  ADD COLUMN IF NOT EXISTS detected_at timestamptz DEFAULT now();

-- Also add source column to roster_uploads (some already have it from extension build,
-- this makes it safe to re-run).
ALTER TABLE roster_uploads
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Index for querying alerts by detection source.
CREATE INDEX IF NOT EXISTS idx_switch_alerts_detection_source
  ON switch_alerts (detection_source);
