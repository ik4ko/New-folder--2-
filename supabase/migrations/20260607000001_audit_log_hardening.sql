-- ============================================================
-- audit_log hardening
-- Migration: 20260607000001
--
-- Adds three missing HIPAA 164.312(b) context columns,
-- a tamper-detection row hash, and a trigger that prevents
-- DELETE on audit_log even from the service role.
-- ============================================================

-- ── 1. New context columns ────────────────────────────────────────────────────

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS ip_address  TEXT,
  ADD COLUMN IF NOT EXISTS user_agent  TEXT,
  ADD COLUMN IF NOT EXISTS session_id  TEXT;

-- ── 2. Tamper-detection hash ──────────────────────────────────────────────────
-- sha256( id || user_id || action || created_at ) — computed once on INSERT,
-- stored as hex.  Requires pgcrypto (enabled in the core schema migration).

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS row_hash TEXT
    GENERATED ALWAYS AS (
      encode(
        digest(
          id::text ||
          coalesce(user_id::text, '') ||
          action ||
          created_at::text,
          'sha256'
        ),
        'hex'
      )
    ) STORED;

-- ── 3. Prevent DELETE — trigger (fires even for service-role connections) ─────

CREATE OR REPLACE FUNCTION public.audit_log_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log rows are immutable — DELETE is not permitted (HIPAA §164.312(b))';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log;

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_prevent_delete();

-- ── 4. Prevent UPDATE via SQL rule ───────────────────────────────────────────
-- Defense-in-depth: rules run before triggers and before RLS.

CREATE OR REPLACE RULE audit_log_no_update
  AS ON UPDATE TO public.audit_log
  DO INSTEAD NOTHING;

-- ── 5. Index for the new context columns ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_log_ip
  ON public.audit_log (ip_address)
  WHERE ip_address IS NOT NULL;

COMMENT ON COLUMN public.audit_log.ip_address IS
  'Client IP from x-forwarded-for. Required by HIPAA §164.312(b).';
COMMENT ON COLUMN public.audit_log.user_agent IS
  'Browser / extension user-agent string.';
COMMENT ON COLUMN public.audit_log.session_id IS
  'Supabase session ID or extension install ID.';
COMMENT ON COLUMN public.audit_log.row_hash IS
  'sha256(id||user_id||action||created_at) for tamper detection. Generated, never writable.';
