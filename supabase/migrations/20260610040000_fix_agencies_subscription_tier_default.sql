-- provisionAgency's core insert omits subscription_tier, so the column DEFAULT
-- applied — but the default was 'solo', which is NOT in the
-- agencies_subscription_tier_check set ('trial','beta','broker','agency',
-- 'enterprise'). Every agency insert therefore failed with a CHECK violation,
-- making provisionAgency throw — surfaced as the "Complete Account Setup"
-- Server Component render error for every new / re-provisioned account.
-- (Applied to production 2026-06-10 via MCP.)
ALTER TABLE public.agencies ALTER COLUMN subscription_tier SET DEFAULT 'trial';
