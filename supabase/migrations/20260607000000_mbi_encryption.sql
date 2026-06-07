-- ============================================================
-- MBI Encryption — migrate plaintext MBI to encrypted-only
-- Migration: 20260607000000
--
-- Before:
--   book_of_business.mbi  TEXT  (plaintext Medicare Beneficiary Identifier)
--
-- After:
--   book_of_business.mbi_plaintext_deprecated  TEXT  (renamed — DO NOT READ)
--   book_of_business.mbi_encrypted             TEXT  (existing — AES-256-GCM ciphertext)
--   book_of_business.mbi_hash                  TEXT  (HMAC-SHA256 for indexed equality lookup)
--
-- The application layer:
--   • Encrypts MBI with AES-256-GCM before INSERT/UPDATE using a key stored
--     in Supabase Vault (secret name: mbi_encryption_key).
--   • Writes the deterministic HMAC-SHA256 hash (mbi_hash) for fast lookup.
--   • Never writes to mbi_plaintext_deprecated.
--   • Decrypts on read using the Vault key via the service role.
--
-- Vault setup (run once after migration, in Supabase dashboard or SQL editor):
--   SELECT vault.create_secret(
--     'your-32-byte-hex-key',   -- value
--     'mbi_encryption_key',      -- name
--     'AES-256-GCM key for MBI encryption in book_of_business'  -- description
--   );
-- ============================================================

BEGIN;

-- ── 1. Rename plaintext column ────────────────────────────────────────────────
ALTER TABLE public.book_of_business
  RENAME COLUMN mbi TO mbi_plaintext_deprecated;

-- ── 2. Add mbi_hash for deterministic lookup ──────────────────────────────────
-- HMAC-SHA256 of the MBI using the application's PHI_MASTER_SECRET.
-- Computed at the application layer; stored here for indexed equality lookups
-- (eq('mbi_hash', hash)) and the UNIQUE constraint that replaces bob_mbi_agency_unique.

ALTER TABLE public.book_of_business
  ADD COLUMN IF NOT EXISTS mbi_hash TEXT;

-- ── 3. Drop the old constraint and indexes that reference the renamed column ───

ALTER TABLE public.book_of_business
  DROP CONSTRAINT IF EXISTS bob_mbi_agency_unique;

DROP INDEX IF EXISTS public.idx_bob_mbi_agency;
DROP INDEX IF EXISTS public.idx_bob_mbi_agency_lookup;

-- ── 4. New unique constraint + index on mbi_hash ──────────────────────────────

ALTER TABLE public.book_of_business
  ADD CONSTRAINT bob_mbi_hash_agency_unique
    UNIQUE (mbi_hash, agency_id);

CREATE INDEX IF NOT EXISTS idx_bob_mbi_hash_agency
  ON public.book_of_business (mbi_hash, agency_id)
  WHERE mbi_hash IS NOT NULL;

-- ── 5. Comments ────────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.book_of_business.mbi_plaintext_deprecated IS
  'DEPRECATED — contains legacy plaintext MBI values. '
  'DO NOT read or write this column. Will be NULLed in a future migration '
  'once all rows have been re-encrypted.';

COMMENT ON COLUMN public.book_of_business.mbi_hash IS
  'HMAC-SHA256(MBI, PHI_MASTER_SECRET) — deterministic, non-reversible identifier '
  'used for equality lookups. Never contains the raw MBI value.';

COMMENT ON COLUMN public.book_of_business.mbi_encrypted IS
  'AES-256-GCM ciphertext of the MBI. Encrypted at the application layer '
  'using a key from Supabase Vault (secret name: mbi_encryption_key). '
  'Format: iv_hex:authtag_hex:ciphertext_hex (from crypto-server.ts encryptCredential).';

COMMIT;
