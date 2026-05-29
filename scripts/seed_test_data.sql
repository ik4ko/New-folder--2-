-- !! CONTAMINATION WARNING (fixed in migration 20260529000001_tenant_isolation_repair) !!
-- This file originally hard-coded agency_id 'd59ad7d4-...' for ALL records,
-- causing ika9191@gmail.com (independent broker) and ikan9191@gmail.com (agency owner)
-- to share the same agency context. The migration above permanently separates them.
--
-- DO NOT re-run this seed file against a live database — it will re-contaminate the tenant
-- data. This file is preserved only for reference. Use migration 20260529000001 instead.
--
-- Step 4: Insert test GHL contacts
INSERT INTO ghl_contacts
  (agency_id, ghl_contact_id, full_name, email, phone, status,
   risk_level, risk_score, current_plan_id, enrollment_status,
   aor_status, assigned_broker_id, last_checked_at)
VALUES
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_1','Margaret Thompson','m.thompson@email.com','(305) 555-0101','ACTIVE','critical',89,'Humana Gold Plus H5619-003','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_2','Robert Sanchez','r.sanchez@email.com','(786) 555-0102','ACTIVE','high',74,'UHC AARP MedicareComplete','active','pending','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_3','Dorothy Williams','d.williams@email.com','(954) 555-0103','ACTIVE','high',71,'Aetna Medicare Advantage','active','locked','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_4','James Rodriguez','j.rodriguez@email.com','(561) 555-0104','ACTIVE','medium',52,'BCBS BlueMedicare HMO','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_5','Betty Johnson','b.johnson@email.com','(407) 555-0105','ACTIVE','medium',48,'Wellcare Value Plus','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_6','Charles Davis','c.davis@email.com','(321) 555-0106','ACTIVE','low',22,'Humana Choice R5826','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_7','Helen Martinez','h.martinez@email.com','(239) 555-0107','ACTIVE','critical',91,'UHC Dual Complete','active','pending','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_8','William Garcia','w.garcia@email.com','(941) 555-0108','ACTIVE','high',68,'Cigna HealthSpring','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_9','Ruth Anderson','r.anderson@email.com','(863) 555-0109','ACTIVE','medium',55,'Molina Medicare Complete','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_10','George Wilson','g.wilson@email.com','(727) 555-0110','ACTIVE','low',19,'Anthem MediBlue','active','none','b8c98adb-aaa9-4016-aa2b-40dd644c6bce',now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_11','Patricia Moore','p.moore@email.com','(813) 555-0111','ACTIVE','critical',87,'Aetna Medicare Premier','active','none',null,now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_12','Kenneth Taylor','k.taylor@email.com','(904) 555-0112','ACTIVE','high',76,'Humana PPO H5619-056','active','none',null,now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_13','Sandra Lee','s.lee@email.com','(352) 555-0113','ACTIVE','medium',43,'Wellcare Spendables','active','none',null,now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_14','Thomas White','t.white@email.com','(386) 555-0114','ACTIVE','low',31,'UHC AARP MedicareComplete','active','none',null,now()),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_15','Nancy Harris','n.harris@email.com','(850) 555-0115','ACTIVE','medium',61,'BCBS BlueMedicare PPO','active','none',null,now())
ON CONFLICT DO NOTHING;

-- Step 4b: Insert test switch alerts
INSERT INTO switch_alerts
  (agency_id, ghl_contact_id, broker_id, alert_type, carrier, priority, status)
VALUES
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_1','0ba87f44-355b-45d8-8b5e-ceb6865d1747','missing_from_roster','Humana','critical','open'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_2','0ba87f44-355b-45d8-8b5e-ceb6865d1747','missing_from_roster','UHC','critical','open'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_7','0ba87f44-355b-45d8-8b5e-ceb6865d1747','missing_from_roster','UHC','high','open'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_8','0ba87f44-355b-45d8-8b5e-ceb6865d1747','new_enrollment','Cigna','low','open'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_11',null,'missing_from_roster','Aetna','high','open');

-- Step 4c: Insert test VCC submissions
INSERT INTO vcc_submissions
  (agency_id, ghl_contact_id, broker_id, submitted_by,
   carrier, client_name, doctor_name, doctor_fax,
   fax_status, send_scheduled_at, deadline_at)
VALUES
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_4','0ba87f44-355b-45d8-8b5e-ceb6865d1747',
   (SELECT id FROM auth.users WHERE email = 'ika9191@gmail.com'),
   'BCBS','James Rodriguez','Dr. Patricia Smith','(800) 555-0201','scheduled',now() + interval '5 days',now() + interval '30 days'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_5','0ba87f44-355b-45d8-8b5e-ceb6865d1747',
   (SELECT id FROM auth.users WHERE email = 'ika9191@gmail.com'),
   'Wellcare','Betty Johnson','Dr. Michael Chen','(800) 555-0202','scheduled',now() + interval '12 days',now() + interval '30 days'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_9','0ba87f44-355b-45d8-8b5e-ceb6865d1747',
   (SELECT id FROM auth.users WHERE email = 'ika9191@gmail.com'),
   'Molina','Ruth Anderson','Dr. Sarah Lopez','(800) 555-0203','sent',now() - interval '3 days',now() + interval '27 days'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_12',null,
   (SELECT id FROM auth.users WHERE email = 'ikan9191@gmail.com'),
   'Humana','Kenneth Taylor','Dr. James Park','(800) 555-0204','pending',null,now() + interval '45 days'),
  ('d59ad7d4-aaea-4831-91d8-60ac30c84d2a','test_contact_13',null,
   (SELECT id FROM auth.users WHERE email = 'ikan9191@gmail.com'),
   'Wellcare','Sandra Lee','Dr. Angela Brown','(800) 555-0205','signed',now() - interval '7 days',now() + interval '23 days');
