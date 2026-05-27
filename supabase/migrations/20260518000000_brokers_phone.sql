-- Add phone column to brokers (needed for My Profile page)
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS phone text;
