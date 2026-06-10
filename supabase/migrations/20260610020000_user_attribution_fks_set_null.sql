-- Account-deletion hardening: all "who did it" attribution FKs to auth.users
-- were ON DELETE NO ACTION — deleting any user with history failed with FK
-- violations. Attribution columns become SET NULL: the business record
-- survives, the actor reference is cleared.
-- vcc_submissions / aor_submissions / book_of_business attribution columns
-- also drop NOT NULL: those are compliance artifacts that must outlive the
-- submitting user. (Applied to production 2026-06-10 via MCP.)

ALTER TABLE public.agency_invites    DROP CONSTRAINT agency_invites_invited_by_fkey,
  ADD CONSTRAINT agency_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.escalation_timers DROP CONSTRAINT escalation_timers_csr_id_fkey,
  ADD CONSTRAINT escalation_timers_csr_id_fkey FOREIGN KEY (csr_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ghl_contacts      DROP CONSTRAINT ghl_contacts_assigned_broker_id_fkey,
  ADD CONSTRAINT ghl_contacts_assigned_broker_id_fkey FOREIGN KEY (assigned_broker_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.retention_events  DROP CONSTRAINT retention_events_resolved_by_fkey,
  ADD CONSTRAINT retention_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.roster_uploads    DROP CONSTRAINT roster_uploads_uploaded_by_fkey,
  ADD CONSTRAINT roster_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.switch_alerts     DROP CONSTRAINT switch_alerts_resolved_by_fkey,
  ADD CONSTRAINT switch_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.switch_alerts     DROP CONSTRAINT switch_alerts_acknowledged_by_fkey,
  ADD CONSTRAINT switch_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vcc_submissions  ALTER COLUMN submitted_by DROP NOT NULL;
ALTER TABLE public.vcc_submissions  DROP CONSTRAINT ssbci_submissions_submitted_by_fkey,
  ADD CONSTRAINT ssbci_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.aor_submissions  ALTER COLUMN submitted_by DROP NOT NULL;
ALTER TABLE public.aor_submissions  DROP CONSTRAINT aor_submissions_submitted_by_fkey,
  ADD CONSTRAINT aor_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.book_of_business ALTER COLUMN synced_by DROP NOT NULL;
ALTER TABLE public.book_of_business DROP CONSTRAINT book_of_business_synced_by_fkey,
  ADD CONSTRAINT book_of_business_synced_by_fkey FOREIGN KEY (synced_by) REFERENCES auth.users(id) ON DELETE SET NULL;
