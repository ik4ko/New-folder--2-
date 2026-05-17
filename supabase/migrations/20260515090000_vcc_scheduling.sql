-- Add scheduling fields to vcc_submissions
ALTER TABLE vcc_submissions
  ADD COLUMN IF NOT EXISTS send_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_effective_date date;

-- Extend fax_status to allow 'scheduled'
ALTER TABLE vcc_submissions
  DROP CONSTRAINT IF EXISTS vcc_submissions_fax_status_check;

ALTER TABLE vcc_submissions
  ADD CONSTRAINT vcc_submissions_fax_status_check
  CHECK (fax_status IN ('pending','sent','failed','signed','expired','no_fax','scheduled'));
