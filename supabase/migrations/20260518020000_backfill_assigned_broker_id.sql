-- Backfill assigned_broker_id on ghl_contacts for the test agency
-- Links contacts to the broker whose user_id matches the given email
UPDATE ghl_contacts
SET assigned_broker_id = (
  SELECT id FROM auth.users WHERE email = 'ikan9191@gmail.com' LIMIT 1
)
WHERE agency_id = 'd59ad7d4-aaea-4831-91d8-60ac30c84d2a'
  AND assigned_broker_id IS NULL;
