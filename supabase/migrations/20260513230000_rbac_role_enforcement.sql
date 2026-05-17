-- RBAC: agency_admin vs broker role enforcement
-- Adds get_my_role() helper, tightens RLS policies,
-- adds assigned_broker_id to ghl_contacts, adds email to brokers.

-- 1. Drop old constraint first so the UPDATE doesn't violate it
alter table brokers drop constraint if exists brokers_role_check;

-- 2. Migrate existing 'admin' role values to 'agency_admin'
update brokers set role = 'agency_admin' where role = 'admin';

-- 3. Add new constraint with correct values
alter table brokers add constraint brokers_role_check
  check (role in ('broker', 'agency_admin'));

-- 3. Add email column (populated at invite time)
alter table brokers add column if not exists email text;

-- 4. Helper: get current user's role within an agency
create or replace function get_my_role(p_agency_id uuid)
returns text as $$
  select role from brokers
  where user_id = auth.uid()
  and agency_id = p_agency_id
  limit 1;
$$ language sql security definer;

-- 5. agency_credentials: agency_admin only (brokers cannot see OAuth tokens)
drop policy if exists "credentials_owner_only" on agency_credentials;
drop policy if exists "credentials_admin_only" on agency_credentials;
create policy "credentials_admin_only" on agency_credentials
  for all using (
    agency_id in (select id from agencies where owner_id = auth.uid())
    or get_my_role(agency_id) = 'agency_admin'
  );

-- 6. ghl_contacts: add assigned_broker_id column
alter table ghl_contacts
  add column if not exists assigned_broker_id uuid references auth.users(id);

drop policy if exists "contacts_agency_scoped" on ghl_contacts;
drop policy if exists "contacts_admin_access" on ghl_contacts;
drop policy if exists "contacts_broker_access" on ghl_contacts;

-- Admin sees all contacts in their agency
create policy "contacts_admin_access" on ghl_contacts
  for all using (
    agency_id in (select id from agencies where owner_id = auth.uid())
    or get_my_role(agency_id) = 'agency_admin'
  );

-- Broker sees only their assigned contacts
create policy "contacts_broker_access" on ghl_contacts
  for select using (
    assigned_broker_id = auth.uid()
  );

-- 7. retention_events: role-scoped
drop policy if exists "events_agency_scoped" on retention_events;
drop policy if exists "events_admin_access" on retention_events;
drop policy if exists "events_broker_access" on retention_events;

create policy "events_admin_access" on retention_events
  for all using (
    agency_id in (select id from agencies where owner_id = auth.uid())
    or get_my_role(agency_id) = 'agency_admin'
  );

create policy "events_broker_access" on retention_events
  for select using (
    ghl_contact_id in (
      select ghl_contact_id from ghl_contacts
      where assigned_broker_id = auth.uid()
    )
  );
