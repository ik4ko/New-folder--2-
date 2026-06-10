-- Security: lock down seat-count helper functions
--
-- Advisor finding (0029): get_active_seat_count(uuid) and get_seat_overage(uuid)
-- are SECURITY DEFINER and were executable by any signed-in user via
-- /rest/v1/rpc with an ARBITRARY agency_id — a cross-tenant leak of agency
-- headcount and seat-overage status.
--
-- Audit (2026-06-10): the only caller is the enforce_broker_seat_limit trigger
-- function, which is itself SECURITY DEFINER owned by postgres — nested EXECUTE
-- checks resolve against postgres, so revoking client roles cannot break seat
-- enforcement. No app code calls these via supabase.rpc().
--
-- get_my_agency_id() / get_user_agency_id() are intentionally left executable
-- by authenticated: they take no parameters, derive strictly from auth.uid(),
-- and are referenced by RLS policies (which check EXECUTE against the querying
-- role). anon is revoked there too — auth.uid() is NULL for anon anyway.

-- Seat-count helpers: server-side only
REVOKE EXECUTE ON FUNCTION public.get_active_seat_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_seat_overage(uuid)      FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_active_seat_count(uuid) TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_seat_overage(uuid)      TO service_role;

-- Identity helpers: keep authenticated (used in RLS), drop anon + PUBLIC
REVOKE EXECUTE ON FUNCTION public.get_my_agency_id()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_agency_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_agency_id()   TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_user_agency_id() TO authenticated, service_role;
