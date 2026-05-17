-- Supabase schema for AegisSage Integrated Intelligence

-- agencies table – core agency metadata
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_at timestamp with time zone default now()
);

-- agency_credentials – GHL OAuth tokens (encrypted at rest)
create table agency_credentials (
  agency_id uuid references agencies(id) on delete cascade primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- carrier_logins – encrypted carrier portal credentials per agency
create table carrier_logins (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade,
  carrier text not null,
  username text not null,
  password_encrypted text not null,
  notes text,
  created_at timestamp with time zone default now()
);
