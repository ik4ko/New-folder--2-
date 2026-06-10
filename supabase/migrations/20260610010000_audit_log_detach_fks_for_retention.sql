-- audit_log must OUTLIVE the principals it records (HIPAA §164.316(b)(2)(i):
-- 6-year retention). Previously:
--   agency_id FK ON DELETE CASCADE  → cascade fired audit_log_no_delete trigger
--                                     → ANY agency/account deletion aborted
--   user_id   FK ON DELETE NO ACTION → deleting an auth user with audit rows
--                                      failed with FK violation
-- Fix: drop both FKs. Columns remain as plain uuids preserving linkage;
-- the immutability trigger stays and now never conflicts with cascades.
-- (Applied to production 2026-06-10 via MCP as audit_log_detach_fks_for_retention.)

ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_agency_id_fkey;
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_user_id_fkey;

CREATE INDEX IF NOT EXISTS idx_audit_log_agency_id ON public.audit_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id   ON public.audit_log(user_id);
