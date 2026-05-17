ALTER TABLE aor_submissions
  ADD COLUMN IF NOT EXISTS signature_method text DEFAULT 'email_link'
    CHECK (signature_method IN (
      'email_link',
      'sms_link',
      'manual_upload',
      'docusign',
      'in_person'
    ));
