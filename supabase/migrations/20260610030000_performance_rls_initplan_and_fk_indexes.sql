-- Performance: advisor remediation 2026-06-10 (applied to production via MCP)
--
-- Part 1 — auth_rls_initplan: 26 policies re-evaluated auth.uid()/auth.role()
-- PER ROW. Wrapped in (select ...) so Postgres evaluates once per query.
-- Mechanical, semantics-preserving rewrite generated from pg_policy.
-- Verified post-apply: zero remaining bare auth.*() calls in public policies.
--
-- Part 2 — unindexed_foreign_keys: 45 FK columns indexed. agency_id columns
-- are filtered by every RLS check; child-side FK indexes also prevent seq
-- scans during cascade deletes (member/agency deletion).
--
-- Part 3 (separate apply: drop_duplicate_indexes) — dropped
-- idx_carrier_baselines_lookup and idx_carrier_schema_maps_fingerprint,
-- which duplicated UNIQUE-constraint indexes.
--
-- Accepted residual (intentional, do not "fix"):
--   • multiple-permissive-policy pairs (broker_own vs agency_staff) on
--     profiles, brokers, vcc_submissions, carrier_logins, sync_results,
--     carrier_baselines, member_detection_log — deliberate role-split.
--   • duplicate indexes in auth./storage. schemas — Supabase-managed.
--
-- Full statement list lives in the production migration ledger
-- (performance_rls_initplan_and_fk_indexes). This repo copy records the
-- equivalent DDL for disaster recovery.

ALTER POLICY agencies_delete ON public.agencies USING ((owner_id = (select auth.uid())));
ALTER POLICY agencies_insert ON public.agencies WITH CHECK ((owner_id = (select auth.uid())));
ALTER POLICY agencies_select ON public.agencies USING (((owner_id = (select auth.uid())) OR (id = get_my_agency_id())));
ALTER POLICY agencies_update ON public.agencies USING ((owner_id = (select auth.uid())));
ALTER POLICY agency_read_own_delivery_log ON public.alert_delivery_log USING ((alert_id IN ( SELECT switch_alerts.id FROM switch_alerts WHERE (switch_alerts.agency_id IN ( SELECT brokers.agency_id FROM brokers WHERE (brokers.user_id = (select auth.uid())) UNION SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())))))));
ALTER POLICY bob_agency_access ON public.book_of_business USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())) UNION SELECT brokers.agency_id FROM brokers WHERE (brokers.user_id = (select auth.uid())))));
ALTER POLICY brokers_agency_owner_sees_all ON public.brokers USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())))));
ALTER POLICY brokers_delete ON public.brokers USING (((user_id = (select auth.uid())) OR (agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid()))))));
ALTER POLICY brokers_insert ON public.brokers WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY brokers_own_row ON public.brokers USING (((user_id = (select auth.uid())) AND (is_active = true)));
ALTER POLICY brokers_select ON public.brokers USING (((user_id = (select auth.uid())) OR (agency_id = get_my_agency_id())));
ALTER POLICY brokers_update ON public.brokers USING ((user_id = (select auth.uid())));
ALTER POLICY campaign_templates_read ON public.campaign_templates USING (((select auth.role()) = 'authenticated'::text));
ALTER POLICY carrier_baselines_agency_staff ON public.carrier_baselines USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())) UNION SELECT brokers.agency_id FROM brokers WHERE ((brokers.user_id = (select auth.uid())) AND (brokers.role = ANY (ARRAY['agency_owner'::text, 'agency_admin'::text, 'customer_service'::text]))))));
ALTER POLICY carrier_baselines_broker_own ON public.carrier_baselines USING ((broker_id IN ( SELECT brokers.id FROM brokers WHERE (brokers.user_id = (select auth.uid())))));
ALTER POLICY carrier_logins_broker_own ON public.carrier_logins USING ((broker_id IN ( SELECT brokers.id FROM brokers WHERE (brokers.user_id = (select auth.uid())))));
ALTER POLICY carrier_logins_principal ON public.carrier_logins USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())) UNION SELECT brokers.agency_id FROM brokers WHERE ((brokers.user_id = (select auth.uid())) AND (brokers.role = ANY (ARRAY['agency_owner'::text, 'agency_admin'::text, 'customer_service'::text]))))));
ALTER POLICY audit_log_agency_staff ON public.detection_audit_log USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())) UNION SELECT brokers.agency_id FROM brokers WHERE ((brokers.user_id = (select auth.uid())) AND (brokers.role = ANY (ARRAY['agency_owner'::text, 'agency_admin'::text, 'customer_service'::text]))))));
ALTER POLICY detection_log_agency_staff ON public.member_detection_log USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())) UNION SELECT brokers.agency_id FROM brokers WHERE ((brokers.user_id = (select auth.uid())) AND (brokers.role = ANY (ARRAY['agency_owner'::text, 'agency_admin'::text, 'customer_service'::text]))))));
ALTER POLICY detection_log_broker_own ON public.member_detection_log USING ((broker_id IN ( SELECT brokers.id FROM brokers WHERE (brokers.user_id = (select auth.uid())))));
ALTER POLICY agency_read_own_errors ON public.roster_upload_errors USING ((agency_id IN ( SELECT brokers.agency_id FROM brokers WHERE (brokers.user_id = (select auth.uid())) UNION SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())))));
ALTER POLICY alerts_delete_owner_only ON public.switch_alerts USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())))));
ALTER POLICY alerts_select_broker_scoped ON public.switch_alerts USING (((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())))) OR (agency_id IN ( SELECT brokers.agency_id FROM brokers WHERE ((brokers.user_id = (select auth.uid())) AND (brokers.role = ANY (ARRAY['agency_admin'::text, 'customer_service'::text]))))) OR (broker_id IN ( SELECT brokers.id FROM brokers WHERE (brokers.user_id = (select auth.uid()))))));
ALTER POLICY sync_results_agency_staff ON public.sync_results USING ((agency_id IN ( SELECT agencies.id FROM agencies WHERE (agencies.owner_id = (select auth.uid())) UNION SELECT brokers.agency_id FROM brokers WHERE ((brokers.user_id = (select auth.uid())) AND (brokers.role = ANY (ARRAY['agency_owner'::text, 'agency_admin'::text, 'customer_service'::text]))))));
ALTER POLICY sync_results_broker_own ON public.sync_results USING ((broker_id IN ( SELECT brokers.id FROM brokers WHERE (brokers.user_id = (select auth.uid())))));
ALTER POLICY templates_read ON public.vcc_form_templates USING (((select auth.role()) = 'authenticated'::text));

CREATE INDEX IF NOT EXISTS idx_aep_schedule_broker_id ON public.aep_schedule(broker_id);
CREATE INDEX IF NOT EXISTS idx_aep_schedule_campaign_enrollment_id ON public.aep_schedule(campaign_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_agencies_owner_id ON public.agencies(owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_invites_invited_by ON public.agency_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_aor_submissions_agency_id ON public.aor_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_aor_submissions_broker_id ON public.aor_submissions(broker_id);
CREATE INDEX IF NOT EXISTS idx_aor_submissions_submitted_by ON public.aor_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_billing_events_agency_id ON public.billing_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_book_of_business_synced_by ON public.book_of_business(synced_by);
CREATE INDEX IF NOT EXISTS idx_brokers_user_id ON public.brokers(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_agency_id ON public.campaign_enrollments(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_broker_id ON public.campaign_enrollments(broker_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_template_id ON public.campaign_enrollments(template_id);
CREATE INDEX IF NOT EXISTS idx_carrier_baselines_agency_id ON public.carrier_baselines(agency_id);
CREATE INDEX IF NOT EXISTS idx_carrier_email_forwards_agency_id ON public.carrier_email_forwards(agency_id);
CREATE INDEX IF NOT EXISTS idx_carrier_email_forwards_broker_id ON public.carrier_email_forwards(broker_id);
CREATE INDEX IF NOT EXISTS idx_carrier_false_positive_tracker_agency_id ON public.carrier_false_positive_tracker(agency_id);
CREATE INDEX IF NOT EXISTS idx_carrier_logins_broker_id ON public.carrier_logins(broker_id);
CREATE INDEX IF NOT EXISTS idx_carrier_schema_history_map_id ON public.carrier_schema_history(map_id);
CREATE INDEX IF NOT EXISTS idx_escalation_timers_agency_id ON public.escalation_timers(agency_id);
CREATE INDEX IF NOT EXISTS idx_escalation_timers_alert_id ON public.escalation_timers(alert_id);
CREATE INDEX IF NOT EXISTS idx_escalation_timers_broker_id ON public.escalation_timers(broker_id);
CREATE INDEX IF NOT EXISTS idx_escalation_timers_csr_id ON public.escalation_timers(csr_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_aor_submission_id ON public.ghl_contacts(aor_submission_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_assigned_broker_id ON public.ghl_contacts(assigned_broker_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_broker_id ON public.ghl_contacts(broker_id);
CREATE INDEX IF NOT EXISTS idx_member_detection_log_agency_id ON public.member_detection_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_member_detection_log_switch_alert_id ON public.member_detection_log(switch_alert_id);
CREATE INDEX IF NOT EXISTS idx_retention_events_agency_id ON public.retention_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_retention_events_broker_id ON public.retention_events(broker_id);
CREATE INDEX IF NOT EXISTS idx_retention_events_resolved_by ON public.retention_events(resolved_by);
CREATE INDEX IF NOT EXISTS idx_roster_members_agency_id ON public.roster_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_roster_members_upload_id ON public.roster_members(upload_id);
CREATE INDEX IF NOT EXISTS idx_roster_uploads_agency_id ON public.roster_uploads(agency_id);
CREATE INDEX IF NOT EXISTS idx_roster_uploads_broker_id ON public.roster_uploads(broker_id);
CREATE INDEX IF NOT EXISTS idx_roster_uploads_uploaded_by ON public.roster_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_switch_alerts_acknowledged_by ON public.switch_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_switch_alerts_broker_id ON public.switch_alerts(broker_id);
CREATE INDEX IF NOT EXISTS idx_switch_alerts_detection_log_id ON public.switch_alerts(detection_log_id);
CREATE INDEX IF NOT EXISTS idx_switch_alerts_resolved_by ON public.switch_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_switch_alerts_upload_id ON public.switch_alerts(upload_id);
CREATE INDEX IF NOT EXISTS idx_sync_results_parent_sync_id ON public.sync_results(parent_sync_id);
CREATE INDEX IF NOT EXISTS idx_vcc_submissions_agency_id ON public.vcc_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_vcc_submissions_form_template_id ON public.vcc_submissions(form_template_id);
CREATE INDEX IF NOT EXISTS idx_vcc_submissions_submitted_by ON public.vcc_submissions(submitted_by);

-- Duplicate-index cleanup (applied as drop_duplicate_indexes):
DROP INDEX IF EXISTS public.idx_carrier_baselines_lookup;
DROP INDEX IF EXISTS public.idx_carrier_schema_maps_fingerprint;
