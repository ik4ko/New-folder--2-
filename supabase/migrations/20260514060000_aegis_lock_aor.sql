-- ═══════════════════════════════════════════════════
-- Aegis Lock — AOR (Appointment of Representative)
-- ═══════════════════════════════════════════════════

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('aor-templates', 'aor-templates', false, 52428800, ARRAY['application/pdf']),
  ('phi-vault',     'phi-vault',     false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- aor-templates: service role write, authenticated read
CREATE POLICY "aor_templates_service_write" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'aor-templates');

CREATE POLICY "aor_templates_auth_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'aor-templates');

-- phi-vault: service role write, authenticated read (RLS on aor_submissions enforces agency scope)
CREATE POLICY "phi_vault_service_write" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'phi-vault');

CREATE POLICY "phi_vault_auth_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'phi-vault');

-- ── AOR submissions table ──────────────────────────────────────────────────
CREATE TABLE aor_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  ghl_contact_id text NOT NULL,
  broker_id uuid REFERENCES brokers(id) NOT NULL,
  submitted_by uuid REFERENCES auth.users(id) NOT NULL,

  -- Client info (no raw PHI in DB)
  client_name text NOT NULL,
  medicare_id_hash text,
  client_email text,
  client_phone text,

  -- Broker info snapshot at time of submission
  broker_name text NOT NULL,
  broker_npn text,
  broker_address text,

  -- Carrier targeting
  carrier text NOT NULL,
  carrier_fax text,

  -- Document
  filled_pdf_path text,

  -- Signature workflow
  status text NOT NULL DEFAULT 'prepared'
    CHECK (status IN (
      'prepared','client_sent','client_signed',
      'broker_signed','faxed','confirmed','expired','rejected'
    )),

  -- Secure signature tokens (single-use)
  client_signature_token text UNIQUE,
  client_signature_token_expires_at timestamp with time zone,
  client_signed_at timestamp with time zone,
  client_signature_name text,

  broker_signed_at timestamp with time zone,
  broker_signature_name text,

  -- Fax tracking
  fax_confirmation_id text,
  fax_sent_at timestamp with time zone,
  fax_status text DEFAULT 'pending'
    CHECK (fax_status IN ('pending','sent','failed','confirmed')),

  -- Proof storage
  confirmation_pdf_path text,

  notes text,
  expires_at timestamp with time zone DEFAULT (now() + interval '1 year'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE aor_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aor_principal_all" ON aor_submissions
  FOR ALL USING (is_principal(agency_id));

CREATE POLICY "aor_broker_own" ON aor_submissions
  FOR ALL USING (
    broker_id IN (
      SELECT id FROM brokers WHERE user_id = auth.uid()
    )
  );

-- ── Lock status columns on ghl_contacts ───────────────────────────────────
ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS aor_status text DEFAULT 'none'
    CHECK (aor_status IN ('none','pending','locked','expired')),
  ADD COLUMN IF NOT EXISTS aor_submission_id uuid REFERENCES aor_submissions(id);

-- ── Agency protection rate view ────────────────────────────────────────────
CREATE OR REPLACE VIEW agency_protection_stats AS
SELECT
  agency_id,
  COUNT(*) AS total_contacts,
  COUNT(*) FILTER (WHERE aor_status = 'locked') AS locked_contacts,
  ROUND(
    COUNT(*) FILTER (WHERE aor_status = 'locked') * 100.0
    / NULLIF(COUNT(*), 0), 1
  ) AS protection_rate
FROM ghl_contacts
GROUP BY agency_id;

-- ── Seed CMS-1696 template record ─────────────────────────────────────────
INSERT INTO vcc_form_templates
  (id, carrier, carrier_display_name, year, form_name, storage_path, version, field_map, active)
VALUES (
  'cms_1696_2026',
  'cms',
  'CMS — All Carriers',
  2026,
  'CMS-1696 Appointment of Representative',
  'aor-templates/cms_1696_2026.pdf',
  1,
  '{
    "client_name":         {"page":1,"x":180,"y":620,"size":11},
    "medicare_id":         {"page":1,"x":180,"y":598,"size":11},
    "broker_name":         {"page":1,"x":180,"y":545,"size":11},
    "broker_npn":          {"page":1,"x":180,"y":523,"size":11},
    "broker_address":      {"page":1,"x":180,"y":501,"size":10},
    "scope_of_appointment":{"page":1,"x":60, "y":465,"size":10},
    "submission_date":     {"page":1,"x":400,"y":620,"size":11}
  }'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;
