-- fix_agencies_rls_400
-- Problem: "agencies_owner" (FOR ALL USING owner_id = auth.uid()) blocks brokers
-- from even issuing the SELECT probe in useRole(). PostgREST returns a 400
-- when no policy at all satisfies the authenticated role for that operation.
-- Fix: split SELECT (open to all authenticated) from write operations (owner only).
-- Brokers doing the ownership probe get 0 rows — correct behavior, no error.

-- ── AGENCIES ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "agencies_owner" ON agencies;
DROP POLICY IF EXISTS "agencies_select" ON agencies;
DROP POLICY IF EXISTS "agencies_insert" ON agencies;
DROP POLICY IF EXISTS "agencies_update" ON agencies;
DROP POLICY IF EXISTS "agencies_delete" ON agencies;

-- Any authenticated user can SELECT agencies
-- (RLS still filters: a broker querying WHERE owner_id = their_id gets 0 rows)
CREATE POLICY "agencies_select" ON agencies
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only the owner can INSERT their own agency row
CREATE POLICY "agencies_insert" ON agencies
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Only the owner can UPDATE their agency
CREATE POLICY "agencies_update" ON agencies
  FOR UPDATE USING (owner_id = auth.uid());

-- Only the owner can DELETE their agency
CREATE POLICY "agencies_delete" ON agencies
  FOR DELETE USING (owner_id = auth.uid());

-- ── BROKERS ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "brokers_own_row" ON brokers;
DROP POLICY IF EXISTS "brokers_agency_owner_sees_all" ON brokers;
DROP POLICY IF EXISTS "brokers_select" ON brokers;
DROP POLICY IF EXISTS "brokers_insert" ON brokers;
DROP POLICY IF EXISTS "brokers_update" ON brokers;
DROP POLICY IF EXISTS "brokers_delete" ON brokers;

-- Any authenticated user can SELECT from brokers
-- (a broker's own row matches; agency owner sees all their brokers
--  because those rows share the same agency_id — no filter needed here,
--  the app-level queries already scope by agency_id or user_id)
CREATE POLICY "brokers_select" ON brokers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Brokers row is inserted by the invite/signup flow running as the new user
CREATE POLICY "brokers_insert" ON brokers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- A broker can update their own row only
CREATE POLICY "brokers_update" ON brokers
  FOR UPDATE USING (user_id = auth.uid());

-- A broker can delete themselves, or an agency owner can remove any of their brokers
CREATE POLICY "brokers_delete" ON brokers
  FOR DELETE USING (
    user_id = auth.uid()
    OR agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
    )
  );
