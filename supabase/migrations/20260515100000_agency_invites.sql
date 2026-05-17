-- Track pending agency invitations
CREATE TABLE IF NOT EXISTS agency_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'broker' CHECK (role IN ('broker', 'agency_admin')),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_agency_invites_agency_status ON agency_invites(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_invites_email ON agency_invites(email);

ALTER TABLE agency_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_admins_manage_invites" ON agency_invites
  USING (
    EXISTS (
      SELECT 1 FROM brokers b
      WHERE b.user_id = auth.uid()
        AND b.agency_id = agency_invites.agency_id
        AND b.role IN ('agency_owner', 'agency_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM agencies a
      WHERE a.owner_id = auth.uid()
        AND a.id = agency_invites.agency_id
    )
  );
