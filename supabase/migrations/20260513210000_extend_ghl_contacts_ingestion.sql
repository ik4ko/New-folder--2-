-- Extend ghl_contacts with encrypted PHI storage and operational fields
-- needed by the CSV ingestion engine.
alter table public.ghl_contacts
  add column if not exists mbi_hash text,
  add column if not exists mbi_enc jsonb,
  add column if not exists dob_enc jsonb,
  add column if not exists phone_enc jsonb,
  add column if not exists broker_id uuid references public.brokers(id),
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists source text,
  add column if not exists updated_at timestamptz not null default now();

-- Fast MBI-hash lookups per agency
create unique index if not exists ghl_contacts_mbi_hash_agency_idx
  on public.ghl_contacts(agency_id, mbi_hash) where mbi_hash is not null;

-- Extend retention_events with fields needed by the risk evaluation engine
alter table public.retention_events
  add column if not exists broker_id uuid references public.brokers(id),
  add column if not exists risk_level text not null default 'LOW'
    check (risk_level in ('LOW', 'HIGH')),
  add column if not exists days_until_effective integer,
  add column if not exists trigger_reason text,
  add column if not exists source text;

-- Extend agency_credentials to hold encrypted GHL API key and webhook URL.
-- Make OAuth token columns nullable since they're only set during the OAuth flow.
alter table public.agency_credentials
  alter column access_token  drop not null,
  alter column refresh_token drop not null,
  alter column expires_at    drop not null,
  add column if not exists ghl_api_key_enc jsonb,
  add column if not exists webhook_url_enc jsonb;
