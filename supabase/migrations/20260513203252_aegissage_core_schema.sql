-- AegisSage Core Schema — clean-slate migration
-- Drops orphaned legacy tables, then creates the full schema in dependency order.

-- Enable pgcrypto for token encryption
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Drop orphaned legacy tables (no production data — fresh project)
-- ---------------------------------------------------------------------------
drop table if exists carrier_logins cascade;
drop table if exists agency_credentials cascade;
drop table if exists agencies cascade;

-- ---------------------------------------------------------------------------
-- AGENCIES
-- ---------------------------------------------------------------------------
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  status text not null default 'trial'
    check (status in ('trial','active','suspended')),
  tier text not null default 'starter'
    check (tier in ('starter','professional','enterprise')),
  trial_expires_at timestamp with time zone default (now() + interval '14 days'),
  ghl_hipaa_enabled boolean default false,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- BROKERS
-- ---------------------------------------------------------------------------
create table brokers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  npn text,
  role text not null default 'broker' check (role in ('broker','admin')),
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- AGENCY_CREDENTIALS — GHL OAuth tokens per agency
-- ---------------------------------------------------------------------------
create table agency_credentials (
  agency_id uuid references agencies(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamp with time zone not null,
  location_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- GHL_CONTACTS — NO ePHI — GHL contact ID reference only
-- ---------------------------------------------------------------------------
create table ghl_contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  ghl_contact_id text not null,
  risk_level text default 'low'
    check (risk_level in ('low','medium','high','critical')),
  risk_score integer default 0,
  current_plan_id text,
  enrollment_status text,
  last_checked_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(agency_id, ghl_contact_id)
);

-- ---------------------------------------------------------------------------
-- RETENTION_EVENTS
-- ---------------------------------------------------------------------------
create table retention_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  ghl_contact_id text not null,
  event_type text not null check (event_type in (
    'plan_switch','lapse','network_change','ssbci_filed','broker_outreach','resolved'
  )),
  previous_value text,
  new_value text,
  risk_delta integer default 0,
  resolved_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- AUDIT_LOG — append-only (HIPAA 164.312(b) — 6-year retention)
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table agencies           enable row level security;
alter table brokers            enable row level security;
alter table agency_credentials enable row level security;
alter table ghl_contacts       enable row level security;
alter table retention_events   enable row level security;
alter table audit_log          enable row level security;

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

-- agencies: owner only
create policy "agency_owner_access" on agencies
  for all using (owner_id = auth.uid());

-- brokers: agency owner OR the broker themselves
create policy "broker_agency_access" on brokers
  for all using (
    agency_id in (
      select id from agencies where owner_id = auth.uid()
      union
      select agency_id from brokers where user_id = auth.uid()
    )
  );

-- agency_credentials: agency owner only (protects OAuth tokens)
create policy "credentials_owner_only" on agency_credentials
  for all using (
    agency_id in (select id from agencies where owner_id = auth.uid())
  );

-- ghl_contacts: agency-scoped (owner + brokers)
create policy "contacts_agency_scoped" on ghl_contacts
  for all using (
    agency_id in (
      select id from agencies where owner_id = auth.uid()
      union
      select agency_id from brokers where user_id = auth.uid()
    )
  );

-- retention_events: agency-scoped
create policy "events_agency_scoped" on retention_events
  for all using (
    agency_id in (
      select id from agencies where owner_id = auth.uid()
      union
      select agency_id from brokers where user_id = auth.uid()
    )
  );

-- audit_log: INSERT only for agency members — no UPDATE, no DELETE ever
create policy "audit_insert_only" on audit_log
  for insert with check (
    agency_id in (
      select id from agencies where owner_id = auth.uid()
      union
      select agency_id from brokers where user_id = auth.uid()
    )
  );

-- audit_log: SELECT for agency owner only
create policy "audit_read" on audit_log
  for select using (
    agency_id in (
      select id from agencies where owner_id = auth.uid()
    )
  );
