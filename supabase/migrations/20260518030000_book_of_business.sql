-- Separate carrier roster data from GHL CRM contacts.
-- book_of_business is the source of truth for who a broker's clients are.
-- ghl_contacts stays as the GHL CRM integration layer only.

CREATE TABLE book_of_business (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  broker_id uuid REFERENCES brokers(id),
  synced_by uuid REFERENCES auth.users(id) NOT NULL,

  carrier text NOT NULL,
  carrier_display_name text,

  member_id text,
  full_name text,
  plan_name text,
  plan_id text,
  effective_date date,
  status text DEFAULT 'active',

  verification_status text DEFAULT 'verified'
    CHECK (verification_status IN ('verified','missing','new','unverified')),
  last_verified_at timestamp with time zone DEFAULT now(),
  first_seen_at timestamp with time zone DEFAULT now(),
  last_missing_at timestamp with time zone,

  UNIQUE(broker_id, carrier, member_id),

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE book_of_business ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bob_agency_access" ON book_of_business
  FOR ALL USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id FROM brokers WHERE user_id = auth.uid()
    )
  );

ALTER TABLE switch_alerts
  ADD COLUMN IF NOT EXISTS bob_member_id uuid REFERENCES book_of_business(id);
