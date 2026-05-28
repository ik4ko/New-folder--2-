-- ── 20260528020000: Add doctor info fields + chronic plan flag to book_of_business ──
-- Enables brokers to store the PCP name and fax number per member so the
-- VCC form can be pre-filled automatically.  GHL custom fields often carry
-- doctor_name / doctor_fax which are imported here on sync.
-- is_chronic already exists (backfilled to false); no-op if column is there.

ALTER TABLE book_of_business
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS doctor_fax  text;

-- Also add a separate update API row-level audit trail
COMMENT ON COLUMN book_of_business.doctor_name IS 'Primary care physician full name';
COMMENT ON COLUMN book_of_business.doctor_fax  IS 'PCP fax number for VCC dispatch';

-- Index for any future VCC-prefill lookups (lightweight)
CREATE INDEX IF NOT EXISTS idx_bob_has_doctor_fax
  ON book_of_business(agency_id)
  WHERE doctor_fax IS NOT NULL;
