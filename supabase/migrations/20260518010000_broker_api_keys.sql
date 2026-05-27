ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS extension_api_key text UNIQUE;

UPDATE brokers
SET extension_api_key = md5(random()::text) || md5(clock_timestamp()::text)
WHERE extension_api_key IS NULL;
