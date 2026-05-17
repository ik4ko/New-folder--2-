-- Add plaintext contact fields to ghl_contacts
-- These are used for display in the UI; PII stored here is non-PHI
-- (no Medicare ID, DOB, or clinical data — those remain encrypted)
ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;
