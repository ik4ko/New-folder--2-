ALTER TABLE public.roster_members
  ADD COLUMN IF NOT EXISTS enrollment_confirmed boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrollment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS detection_status text
    DEFAULT 'unverified'
    CHECK (detection_status IN (
      'unverified','verified','switching','switched',
      'recoverable','termed_no_partb','deceased',
      'disenrolled','npn_mismatch','pending_enrollment','left'
    )),
  ADD COLUMN IF NOT EXISTS detection_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrolling_broker_npn text,
  ADD COLUMN IF NOT EXISTS future_plan_effective_date date,
  ADD COLUMN IF NOT EXISTS future_plan_name text,
  ADD COLUMN IF NOT EXISTS future_plan_carrier text,
  ADD COLUMN IF NOT EXISTS part_b_active boolean,
  ADD COLUMN IF NOT EXISTS deceased boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS roster_members_detection_status_idx
  ON public.roster_members (detection_status);
