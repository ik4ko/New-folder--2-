-- SSBCI Pillar One: form template library, submissions, and storage buckets.

-- Storage buckets (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ssbci-templates', 'ssbci-templates', false, 52428800, ARRAY['application/pdf']::text[]),
  ('ssbci-filled',    'ssbci-filled',    false, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can read carrier templates
DROP POLICY IF EXISTS "ssbci_templates_authenticated_read" ON storage.objects;
CREATE POLICY "ssbci_templates_authenticated_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ssbci-templates'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: users can only read filled PDFs for their own agency
DROP POLICY IF EXISTS "ssbci_filled_agency_read" ON storage.objects;
CREATE POLICY "ssbci_filled_agency_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ssbci-filled'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM agencies WHERE owner_id = auth.uid()
      UNION
      SELECT agency_id::text FROM brokers WHERE user_id = auth.uid()
    )
  );

-- SSBCI form templates (carrier PDF library)
CREATE TABLE IF NOT EXISTS ssbci_form_templates (
  id text PRIMARY KEY,
  carrier text NOT NULL,
  carrier_display_name text NOT NULL,
  year integer NOT NULL,
  form_name text NOT NULL,
  storage_path text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  field_map jsonb NOT NULL DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ssbci_form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read_authenticated" ON ssbci_form_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- SSBCI submissions (one per client per year)
CREATE TABLE IF NOT EXISTS ssbci_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  ghl_contact_id text NOT NULL,
  broker_id uuid REFERENCES brokers(id),
  submitted_by uuid REFERENCES auth.users(id) NOT NULL,
  carrier text NOT NULL,
  form_template_id text REFERENCES ssbci_form_templates(id),
  client_name text NOT NULL,
  client_dob text,
  medicare_id_hash text,
  doctor_name text,
  doctor_fax text,
  broker_npn text,
  filled_pdf_path text,
  fax_status text DEFAULT 'pending'
    CHECK (fax_status IN ('pending','sent','failed','signed','expired','no_fax')),
  fax_confirmation_id text,
  fax_sent_at timestamp with time zone,
  signed_at timestamp with time zone,
  deadline_at timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ssbci_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssbci_principal_full" ON ssbci_submissions
  FOR ALL USING (is_principal(agency_id));

CREATE POLICY "ssbci_broker_select" ON ssbci_submissions
  FOR SELECT USING (
    broker_id IN (SELECT id FROM brokers WHERE user_id = auth.uid())
  );

CREATE POLICY "ssbci_broker_insert" ON ssbci_submissions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());
