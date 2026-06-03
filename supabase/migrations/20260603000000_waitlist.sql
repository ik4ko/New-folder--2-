create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  agency_name text not null,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create unique index if not exists waitlist_email_unique_idx
  on public.waitlist (email);
