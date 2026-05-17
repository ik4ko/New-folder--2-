-- Fix auth_rls_initplan warnings: wrap auth.uid() in (select ...) so Postgres
-- evaluates it once per query instead of once per row.

-- AGENCIES
drop policy "agency_owner_access" on agencies;
create policy "agency_owner_access" on agencies
  for all using (owner_id = (select auth.uid()));

-- BROKERS
drop policy "broker_agency_access" on brokers;
create policy "broker_agency_access" on brokers
  for all using (
    agency_id in (
      select id from agencies where owner_id = (select auth.uid())
      union
      select agency_id from brokers where user_id = (select auth.uid())
    )
  );

-- AGENCY_CREDENTIALS
drop policy "credentials_owner_only" on agency_credentials;
create policy "credentials_owner_only" on agency_credentials
  for all using (
    agency_id in (select id from agencies where owner_id = (select auth.uid()))
  );

-- GHL_CONTACTS
drop policy "contacts_agency_scoped" on ghl_contacts;
create policy "contacts_agency_scoped" on ghl_contacts
  for all using (
    agency_id in (
      select id from agencies where owner_id = (select auth.uid())
      union
      select agency_id from brokers where user_id = (select auth.uid())
    )
  );

-- RETENTION_EVENTS
drop policy "events_agency_scoped" on retention_events;
create policy "events_agency_scoped" on retention_events
  for all using (
    agency_id in (
      select id from agencies where owner_id = (select auth.uid())
      union
      select agency_id from brokers where user_id = (select auth.uid())
    )
  );

-- AUDIT_LOG
drop policy "audit_insert_only" on audit_log;
create policy "audit_insert_only" on audit_log
  for insert with check (
    agency_id in (
      select id from agencies where owner_id = (select auth.uid())
      union
      select agency_id from brokers where user_id = (select auth.uid())
    )
  );

drop policy "audit_read" on audit_log;
create policy "audit_read" on audit_log
  for select using (
    agency_id in (
      select id from agencies where owner_id = (select auth.uid())
    )
  );
