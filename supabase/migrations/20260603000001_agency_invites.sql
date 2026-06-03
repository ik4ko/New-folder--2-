-- Agency invites table (idempotent — table may already exist from 20260515100000)
-- This migration is a canonical reference for the intended schema.

CREATE TABLE IF NOT EXISTS public.agency_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN (
    'AGENCY_MANAGER',
    'AGENCY_CUSTOMER_SERVICE',
    'BROKER'
  )),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS agency_invites_agency_id_idx
  ON public.agency_invites (agency_id);
CREATE INDEX IF NOT EXISTS agency_invites_email_idx
  ON public.agency_invites (email);

ALTER TABLE public.agency_invites ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation (drop first if already exists)
DROP POLICY IF EXISTS "agency members can view invites" ON public.agency_invites;
CREATE POLICY "agency members can view invites"
  ON public.agency_invites FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.brokers
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency owners and managers can insert invites" ON public.agency_invites;
CREATE POLICY "agency owners and managers can insert invites"
  ON public.agency_invites FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.brokers
      WHERE user_id = auth.uid()
        AND role IN ('agency_owner', 'agency_admin', 'AGENCY_OWNER', 'AGENCY_MANAGER')
    )
  );
