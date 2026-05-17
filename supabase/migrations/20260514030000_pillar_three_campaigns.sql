-- Pillar 3: Retention & Shield Campaigns

-- Campaign templates library (shared, seeded by app)
CREATE TABLE IF NOT EXISTS campaign_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL CHECK (campaign_type IN (
    'aep_shield',
    'ssbci_followup',
    'reactive_save',
    'renewal_reminder',
    'welcome_sequence',
    'network_change'
  )),
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'manual',
    'aep_proximity',
    'switch_alert',
    'ssbci_unsigned',
    'enrollment_anniversary'
  )),
  trigger_days_before integer,
  ghl_workflow_id text,
  ghl_workflow_name text,
  steps jsonb NOT NULL DEFAULT '[]',
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_read_authenticated" ON campaign_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Launched campaign instances per contact
CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  ghl_contact_id text NOT NULL,
  broker_id uuid REFERENCES brokers(id),
  template_id text REFERENCES campaign_templates(id),
  triggered_by text CHECK (triggered_by IN (
    'manual',
    'switch_alert',
    'ssbci_deadline',
    'aep_scheduler',
    'system'
  )),
  trigger_resource_id uuid,
  ghl_workflow_id text,
  status text DEFAULT 'active' CHECK (status IN (
    'active','completed','cancelled','failed'
  )),
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'
);
ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_principal_all" ON campaign_enrollments
  FOR ALL USING (is_principal(agency_id));
CREATE POLICY "enrollments_broker_own" ON campaign_enrollments
  FOR SELECT USING (
    broker_id IN (
      SELECT id FROM brokers WHERE user_id = auth.uid()
    )
  );

-- AEP Shield schedule tracker
CREATE TABLE IF NOT EXISTS aep_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  ghl_contact_id text NOT NULL,
  broker_id uuid REFERENCES brokers(id),
  enrollment_anniversary date,
  aep_start date DEFAULT '2026-10-15',
  aep_end date DEFAULT '2026-12-07',
  reminder_90_sent boolean DEFAULT false,
  reminder_60_sent boolean DEFAULT false,
  reminder_30_sent boolean DEFAULT false,
  reminder_7_sent boolean DEFAULT false,
  campaign_enrollment_id uuid REFERENCES campaign_enrollments(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(agency_id, ghl_contact_id)
);
ALTER TABLE aep_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aep_principal_all" ON aep_schedule
  FOR ALL USING (is_principal(agency_id));
CREATE POLICY "aep_broker_own" ON aep_schedule
  FOR ALL USING (
    broker_id IN (
      SELECT id FROM brokers WHERE user_id = auth.uid()
    )
  );
