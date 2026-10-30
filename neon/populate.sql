-- careOS populate script for a Neon database.
-- Run once in the Neon SQL editor. It creates the clinic tables and loads the current records.
-- Do not run this against the local Docker database.
-- Study images stay in static/records and are served by the app.

BEGIN;

CREATE TABLE users (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'patient')),
  name text NOT NULL
);

CREATE TABLE doctors (
  id serial PRIMARY KEY,
  user_id int UNIQUE REFERENCES users(id),
  name text NOT NULL,
  credentials text NOT NULL,
  specialty text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Female', 'Male')),
  npi text,
  practice text NOT NULL,
  location text NOT NULL,
  phone text
);

CREATE TABLE patients (
  id serial PRIMARY KEY,
  user_id int UNIQUE REFERENCES users(id),
  primary_doctor_id int REFERENCES doctors(id),
  pid text UNIQUE NOT NULL,
  record_token text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  dob date NOT NULL,
  sex text NOT NULL,
  blood_type text,
  allergies jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  surgeries jsonb NOT NULL DEFAULT '[]'::jsonb,
  phone text,
  nic text UNIQUE,
  passport text UNIQUE,
  concierge_note text,
  insurance_name text,
  insurance_group text,
  insurance_member text,
  pharmacy_name text,
  pharmacy_address text,
  pharmacy_phone text
);

CREATE TABLE appointments (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  doctor_id int NOT NULL REFERENCES doctors(id),
  starts_at timestamp NOT NULL,
  duration_min int NOT NULL,
  title text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL,
  location text,
  last_visit_label text
);

CREATE TABLE availability (
  id serial PRIMARY KEY,
  doctor_id int NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('clinic', 'home')),
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE encounters (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  doctor_name text NOT NULL,
  doctor_role text NOT NULL,
  practice text,
  occurred_on date NOT NULL,
  kind text NOT NULL,
  focus text NOT NULL,
  findings text,
  plan text,
  location text,
  status text NOT NULL DEFAULT 'finalized'
);

CREATE TABLE vitals (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  recorded_at timestamp NOT NULL,
  systolic int,
  diastolic int,
  heart_rate int,
  source text NOT NULL,
  note text
);

CREATE TABLE prescriptions (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  code text NOT NULL,
  prescriber text NOT NULL,
  specialty text,
  facility text,
  pharmacy text,
  ordered_at timestamp NOT NULL,
  status text NOT NULL,
  auth_through text,
  course_label text,
  completes_on date
);

CREATE TABLE prescription_items (
  id serial PRIMARY KEY,
  prescription_id int NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  name text NOT NULL,
  strength text,
  form text,
  route text,
  frequency text,
  sig text,
  indication text,
  quantity int,
  supply_label text,
  refills text,
  schedule_slot text,
  schedule_detail text,
  remaining_label text,
  due_label text,
  sort_order int NOT NULL DEFAULT 0,
  completes_on date
);

CREATE TABLE medicines (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  doctors jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX medicines_name_key ON medicines (lower(name));

CREATE TABLE dose_logs (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  item_name text NOT NULL,
  slot text NOT NULL,
  label text NOT NULL,
  status text NOT NULL,
  log_date date NOT NULL
);

CREATE TABLE labs (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  name text NOT NULL,
  category text NOT NULL,
  collected_on date,
  due_label text,
  facility text,
  status text NOT NULL,
  ordering_md text,
  specimen text,
  panel_id text,
  note text,
  acknowledged boolean NOT NULL DEFAULT false,
  report_path text
);

CREATE TABLE lab_results (
  id serial PRIMARY KEY,
  lab_id int NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name text NOT NULL,
  detail text,
  value_num numeric,
  value_text text,
  unit text,
  ref_low numeric,
  ref_high numeric,
  flag text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE imaging_studies (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  modality text NOT NULL,
  title text NOT NULL,
  performed_on date,
  facility text,
  equipment text,
  radiologist text,
  protocol text,
  summary text,
  impression text,
  meta text,
  calcium_score int,
  patient_quote text,
  outlook text,
  vessels jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL,
  image_path text,
  report_path text
);

CREATE TABLE care_orders (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  kind text NOT NULL,
  title text NOT NULL,
  ordered_by text NOT NULL,
  status text NOT NULL,
  schedule_label text,
  facility text,
  instructions text
);

CREATE TABLE invoices (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  code text NOT NULL,
  title text NOT NULL,
  issued_on date NOT NULL,
  due_on date,
  status text NOT NULL,
  insurance_note text,
  patient_due numeric NOT NULL,
  paid_via text,
  paid_on date
);

CREATE TABLE invoice_lines (
  id serial PRIMARY KEY,
  invoice_id int NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL
);

CREATE TABLE consultations (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  doctor_id int NOT NULL REFERENCES doctors(id),
  code text NOT NULL,
  status text NOT NULL,
  modality text NOT NULL,
  narrative text,
  pharmacy text,
  completes_on date,
  started_at timestamptz NOT NULL
);

CREATE TABLE consultation_entries (
  id serial PRIMARY KEY,
  consultation_id int NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  detail text
);

CREATE TABLE consultation_orders (
  id serial PRIMARY KEY,
  consultation_id int NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  detail text,
  note text,
  completes_on date
);

CREATE TABLE patient_tasks (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id int NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  order_id int REFERENCES consultation_orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text,
  note text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'received')),
  file_name text,
  stored_name text,
  uploaded_at timestamp
);

CREATE TABLE refill_requests (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id),
  prescription_id int REFERENCES prescriptions(id),
  created_at timestamp NOT NULL DEFAULT now(),
  status text NOT NULL
);

CREATE TABLE practice_metrics (
  id serial PRIMARY KEY,
  sort_order int NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  caption text NOT NULL,
  delta text NOT NULL
);

CREATE TABLE modality_volumes (
  id serial PRIMARY KEY,
  sort_order int NOT NULL,
  name text NOT NULL,
  units int NOT NULL,
  share numeric NOT NULL
);

CREATE TABLE cohorts (
  id serial PRIMARY KEY,
  sort_order int NOT NULL,
  name text NOT NULL,
  patients int NOT NULL,
  share numeric NOT NULL
);

CREATE TABLE referral_sources (
  id serial PRIMARY KEY,
  sort_order int NOT NULL,
  name text NOT NULL,
  channel text NOT NULL,
  share numeric NOT NULL,
  patients int NOT NULL
);

CREATE TABLE practice_notes (
  id serial PRIMARY KEY,
  body text NOT NULL
);

CREATE TABLE referrals (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  from_doctor_id int NOT NULL REFERENCES doctors(id),
  to_doctor_id int NOT NULL REFERENCES doctors(id),
  source_consult_id int REFERENCES consultations(id) ON DELETE SET NULL,
  order_id int REFERENCES consultation_orders(id) ON DELETE SET NULL,
  follow_consult_id int REFERENCES consultations(id) ON DELETE SET NULL,
  note text,
  status text NOT NULL DEFAULT 'incoming' CHECK (status IN ('incoming', 'in_session', 'completed')),
  created_at timestamp NOT NULL
);

CREATE TABLE patient_access (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id int NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'granted', 'denied', 'revoked')),
  source text NOT NULL CHECK (source IN ('primary', 'appointment', 'referral', 'qr', 'code', 'request', 'registered')),
  created_at timestamp NOT NULL,
  UNIQUE (patient_id, doctor_id)
);

CREATE TABLE access_codes (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamp NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  used_by int REFERENCES doctors(id)
);

CREATE TABLE self_reports (
  id serial PRIMARY KEY,
  patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  occurred_on date NOT NULL,
  title text NOT NULL,
  detail text,
  duration text,
  severity text,
  meds_taken text,
  ongoing boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL
);

CREATE TABLE self_report_edits (
  id serial PRIMARY KEY,
  report_id int NOT NULL REFERENCES self_reports(id) ON DELETE CASCADE,
  changed_at timestamp NOT NULL,
  changes jsonb NOT NULL
);

CREATE TABLE notifications (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamp NOT NULL,
  seen_at timestamp
);

CREATE TABLE sessions (
  id text PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  expires_at timestamp NOT NULL
);

ALTER TABLE encounters ADD COLUMN IF NOT EXISTS consultation_id int REFERENCES consultations(id) ON DELETE SET NULL;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS seen_at timestamp;

INSERT INTO users ("id", "email", "password_hash", "role", "name") VALUES (1, 'irfan.ameerudden@clinica.privata', '96bcc01b9dcaa65b1bf1faf9b12a68a0:191e8fe2334326277badb136dfae17726dea6650bb344d54de114a574ef1a733', 'doctor', 'Dr. Irfan Ameerudden');
INSERT INTO users ("id", "email", "password_hash", "role", "name") VALUES (2, 'sarah.jensen@clinica.privata', '96bcc01b9dcaa65b1bf1faf9b12a68a0:191e8fe2334326277badb136dfae17726dea6650bb344d54de114a574ef1a733', 'doctor', 'Dr. Sarah Jensen');
INSERT INTO users ("id", "email", "password_hash", "role", "name") VALUES (3, 'noor.yadallee@clinica.privata', '96bcc01b9dcaa65b1bf1faf9b12a68a0:191e8fe2334326277badb136dfae17726dea6650bb344d54de114a574ef1a733', 'patient', 'Noor Yadallee');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (1, 1, 'Dr. Irfan Ameerudden', 'MBBS', 'General Practice', 'Male', '1740293816', 'Private Practice • General Practice', 'Suite 210, St. Jude Family Clinic', '(555) 234-8800');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (2, 2, 'Dr. Sarah Jensen', 'MD, FACC', 'Cardiology', 'Female', '1982049182', 'Private Practice • Cardiology Specialist', 'Suite 410, St. Jude Heart Pavilion', '(555) 234-8990');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (3, NULL, 'Dr. Elena Rostova', 'MD, FACC', 'Cardiac Electrophysiology', 'Female', NULL, 'St. Jude Heart Clinic', 'Suite 418, St. Jude Heart Pavilion', '(555) 234-8992');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (4, NULL, 'Dr. James Okonkwo', 'MD', 'Interventional Cardiology', 'Male', NULL, 'St. Jude Heart Pavilion', 'Suite 422, St. Jude Heart Pavilion', '(555) 234-8994');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (5, NULL, 'Dr. Priya Shah', 'MD', 'Heart Failure', 'Female', NULL, 'St. Jude Heart Pavilion', 'Suite 406, St. Jude Heart Pavilion', '(555) 234-8996');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (6, NULL, 'Dr. Marcus Hale', 'MD', 'Preventive Cardiology', 'Male', NULL, 'St. Jude Heart Pavilion', 'Suite 402, St. Jude Heart Pavilion', '(555) 234-8998');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (7, NULL, 'Dr. Emily Watson', 'MD', 'Primary Care', 'Female', NULL, 'Comprehensive Family & Preventive Health', 'West End Primary Care', '(555) 410-2201');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (8, NULL, 'Dr. Marcus Vance', 'MD', 'Gastroenterology', 'Male', NULL, 'Digestive Health & Endoscopy Associates', 'GI Endoscopy Registry', '(555) 410-2210');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (9, NULL, 'Dr. Arthur Pendelton', 'MD', 'Cardiovascular Imaging', 'Male', NULL, 'St. Jude Cardiovascular Imaging Center', 'St. Jude Heart Pavilion', '(555) 410-2220');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (10, NULL, 'Dr. Ronald Hayes', 'MD', 'Echocardiography', 'Male', NULL, 'West End Diagnostic Imaging', 'West End Diagnostic Imaging', '(555) 410-2230');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (11, NULL, 'Dr. K. Miller', 'MD', 'Internal Medicine', 'Female', NULL, 'Internal Medicine Specialists', 'Internal Medicine Specialists', '(555) 410-2240');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (12, NULL, 'Dr. Aris Thorne', 'MD', 'Interventional Endocrinology', 'Male', NULL, 'Thorne Interventional Endocrine', 'Thorne Interventional Endocrine', '(555) 410-2250');
INSERT INTO doctors ("id", "user_id", "name", "credentials", "specialty", "gender", "npi", "practice", "location", "phone") VALUES (13, NULL, 'Dr. Julian Vance', 'MD', 'Sports Physiology', 'Male', NULL, 'Sports Physiology & Geriatrics', 'Sports Physiology & Geriatrics', '(555) 410-2260');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (1, 3, 1, 'PID-4089', 'Noor', 'Yadallee', '1956-04-12', 'Female', 'A+', '["Penicillin (mild hives)","NSAIDs","Shellfish (moderate)"]'::jsonb, '["Atrial fibrillation (paroxysmal)","Mild CAD s/p DES to LAD","Hyperlipidemia"]'::jsonb, '[{"name":"Diagnostic angiogram","year":"2021"},{"name":"Appendectomy","year":"1998"}]'::jsonb, '(555) 014-4089', 'V560412891', NULL, NULL, 'BlueCross BlueShield Premier Care PPO', 'BC-88902', 'EV-940283', 'CVS Pharmacy #4120', '4th St & Broadway', '(555) 234-8901', 'a16a1a58583ff92b0ed84941a5b825f9271508d845a09673');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (2, NULL, 1, 'PID-3921', 'Arthur', 'Pendelton', '1970-03-02', 'Male', 'O+', '[]'::jsonb, '["Hyperlipidemia"]'::jsonb, '[]'::jsonb, NULL, 'P700302118', NULL, 'Established', NULL, NULL, NULL, NULL, NULL, NULL, '55345d0b8c66195113290c28086889260a2bb9cd8388d260');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (3, NULL, 1, 'PID-5104', 'Clara', 'Oswald', '1982-06-01', 'Female', 'B+', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, NULL, 'GB820601442', 'New patient', NULL, NULL, NULL, NULL, NULL, NULL, '72c1dc918db07f0f169f881a77202dca9b12e81070f57a7a');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (4, NULL, 1, 'PID-6204', 'Marcus', 'Brody', '1979-01-15', 'Male', 'A-', '[]'::jsonb, '["Hypertension"]'::jsonb, '[]'::jsonb, NULL, 'B790115220', NULL, 'Home BP log', NULL, NULL, NULL, NULL, NULL, NULL, '440a2637b1648dbe51b69e0f929d8f644a64896fff33449a');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (5, NULL, 1, 'PID-7891', 'Sophia', 'Chen', '1985-09-09', 'Female', 'AB+', '[]'::jsonb, '["Elevated ApoB"]'::jsonb, '[]'::jsonb, NULL, NULL, 'E850909331', 'Preventive', NULL, NULL, NULL, NULL, NULL, NULL, '89b5d64663d3a97261718eda6301cb20ce4693501f8e77ef');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (6, NULL, 1, 'PID-3312', 'David', 'Miller', '1963-02-20', 'Male', 'O-', '["Contrast dye"]'::jsonb, '["CAD s/p angioplasty"]'::jsonb, '[{"name":"Angioplasty","year":"2024"}]'::jsonb, NULL, 'M630220614', NULL, 'Post-procedure', NULL, NULL, NULL, NULL, NULL, NULL, '7e0c5f2c1cc3063543d28dd876fe7ad8bb52c758bd9e6ab6');
INSERT INTO patients ("id", "user_id", "primary_doctor_id", "pid", "first_name", "last_name", "dob", "sex", "blood_type", "allergies", "conditions", "surgeries", "phone", "nic", "passport", "concierge_note", "insurance_name", "insurance_group", "insurance_member", "pharmacy_name", "pharmacy_address", "pharmacy_phone", "record_token") VALUES (7, NULL, 1, 'PID-4410', 'Helen', 'Cho', '1967-08-08', 'Female', 'B-', '[]'::jsonb, '["ICD follow-up"]'::jsonb, '[]'::jsonb, NULL, NULL, 'H670808902', 'Device clinic', NULL, NULL, NULL, NULL, NULL, NULL, '19978d4c8182b6889a0d393a28f1501d185bf564ef7e4e46');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (1, 2, 'clinic', 1, '09:00:00', '13:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (2, 2, 'clinic', 3, '09:00:00', '13:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (3, 2, 'clinic', 5, '09:00:00', '13:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (4, 1, 'clinic', 1, '09:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (5, 1, 'clinic', 2, '09:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (6, 1, 'clinic', 3, '09:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (7, 1, 'clinic', 4, '09:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (8, 1, 'clinic', 5, '09:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (9, 1, 'home', 2, '18:00:00', '20:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (10, 1, 'home', 4, '18:00:00', '20:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (11, 3, 'clinic', 1, '09:00:00', '13:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (12, 3, 'clinic', 3, '09:00:00', '13:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (13, 3, 'clinic', 5, '09:00:00', '13:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (14, 4, 'clinic', 2, '10:00:00', '16:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (15, 4, 'clinic', 4, '10:00:00', '16:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (16, 5, 'clinic', 1, '13:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (17, 5, 'clinic', 2, '13:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (18, 5, 'clinic', 3, '13:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (19, 5, 'clinic', 4, '13:00:00', '17:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (20, 5, 'home', 3, '18:00:00', '20:00:00');
INSERT INTO availability ("id", "doctor_id", "kind", "weekday", "start_time", "end_time") VALUES (21, 6, 'clinic', 5, '08:00:00', '12:00:00');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (1, 1, 1, '2024-11-17 14:15:00', 45, 'Arrhythmia Review', 'Atrial fibrillation follow-up & Holter monitor review', 'scheduled', 'Suite 210, St. Jude Family Clinic', 'Last visit: 3 weeks ago');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (2, 2, 1, '2024-11-17 15:00:00', 30, 'Routine Check', 'Lipid panel review & statin refill', 'scheduled', 'Suite 210, St. Jude Family Clinic', 'Last visit: 3 months ago');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (3, 3, 2, '2024-11-17 15:45:00', 45, 'Cardiology referral', 'Referred by Dr. Irfan Ameerudden for palpitations and an ECG', 'scheduled', 'Suite 410, St. Jude Heart Pavilion (Valet parking at West Gate)', 'Referred today');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (4, 4, 1, '2024-11-17 16:30:00', 30, 'Hypertension Check', 'ACE inhibitor titration & BP log review', 'scheduled', 'Suite 210, St. Jude Family Clinic', 'Last visit: 1 month ago');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (5, 5, 1, '2024-11-17 17:15:00', 30, 'Lab Review', 'ApoB & Lp(a) risk stratification follow-up', 'scheduled', 'Suite 210, St. Jude Family Clinic', 'Last visit: 2 weeks ago');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (6, 6, 1, '2024-11-17 17:45:00', 30, 'Post-Procedure', 'Post-angioplasty 30-day assessment & dual antiplatelet check', 'scheduled', 'Suite 210, St. Jude Family Clinic', 'Last visit: 1 month ago');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (7, 7, 1, '2024-11-17 18:30:00', 20, 'Device Check', 'ICD interrogation & battery review', 'scheduled', 'Suite 210, St. Jude Family Clinic', 'Last visit: 6 months ago');
INSERT INTO appointments ("id", "patient_id", "doctor_id", "starts_at", "duration_min", "title", "reason", "status", "location", "last_visit_label") VALUES (8, 1, 2, '2024-11-21 14:15:00', 45, 'Arrhythmia Follow-up & 12-Lead ECG Review', 'Holter placement and rhythm review', 'scheduled', 'Suite 410, St. Jude Heart Pavilion (Valet parking at West Gate)', 'Referred by Dr. Irfan Ameerudden');
INSERT INTO consultations ("id", "patient_id", "doctor_id", "code", "status", "modality", "narrative", "pharmacy", "started_at", "completes_on") VALUES (4, 1, 2, 'ENC-1', 'in_session', 'in_person', '', NULL, '2026-10-28 14:30:24', NULL);
INSERT INTO encounters ("id", "patient_id", "doctor_name", "doctor_role", "practice", "occurred_on", "kind", "focus", "findings", "plan", "location", "status", "consultation_id") VALUES (1, 1, 'Dr. Irfan Ameerudden, MBBS', 'General Practice', 'St. Jude Family Clinic', '2024-11-14', 'General Practice', 'Routine health maintenance', 'Blood pressure 124/80 mmHg. Patient reports reduced palpitations and stable recovery. General status excellent.', 'Continue current medication plan; routine metabolic panel reassessment in 6 months. Referred to Dr. Sarah Jensen for cardiology review.', 'Suite 210, St. Jude Family Clinic', 'finalized', NULL);
INSERT INTO encounters ("id", "patient_id", "doctor_name", "doctor_role", "practice", "occurred_on", "kind", "focus", "findings", "plan", "location", "status", "consultation_id") VALUES (2, 1, 'Dr. Sarah Jensen, MD', 'Cardiology Consult', 'Cardiology & Concierge Solo Practice', '2024-10-24', 'Cardiology Consult', 'Palpitation evaluation & EKG', 'Sinus rhythm with premature atrial contractions (PACs).', 'Initiated metoprolol succinate 25 mg daily for palpitation suppression. Ordered 12-lead Holter monitoring (48-hr).', 'Cardiology Suite #4', 'finalized', NULL);
INSERT INTO encounters ("id", "patient_id", "doctor_name", "doctor_role", "practice", "occurred_on", "kind", "focus", "findings", "plan", "location", "status", "consultation_id") VALUES (3, 1, 'Dr. Emily Watson, MD', 'Primary Care / PCP', 'Comprehensive Family & Preventive Health', '2024-09-28', 'Primary Care / PCP', 'Annual comprehensive wellness & lipid evaluation', 'Mild hyperlipidemia, elevated LDL (142 mg/dL).', 'Prescribed atorvastatin 20 mg daily at bedtime. Structured dietary counseling and cardiovascular lifestyle guidelines provided.', 'Wellness Clinic', 'finalized', NULL);
INSERT INTO encounters ("id", "patient_id", "doctor_name", "doctor_role", "practice", "occurred_on", "kind", "focus", "findings", "plan", "location", "status", "consultation_id") VALUES (4, 1, 'Dr. Marcus Vance, MD', 'Gastroenterology', 'Digestive Health & Endoscopy Associates', '2024-08-15', 'Gastroenterology', 'GI consult: atypical epigastric burning & dyspepsia', 'Mild GERD, negative for H. pylori antigen.', 'Prescribed pantoprazole 40 mg once daily before breakfast for 4 weeks. Avoid late-evening meals and triggers.', 'GI Endoscopy Registry', 'finalized', NULL);
INSERT INTO encounters ("id", "patient_id", "doctor_name", "doctor_role", "practice", "occurred_on", "kind", "focus", "findings", "plan", "location", "status", "consultation_id") VALUES (5, 1, 'Dr. Emily Watson, MD', 'Primary Care / PCP', 'Hypertension Management Clinic', '2024-06-10', 'Primary Care / PCP', 'Hypertension management follow-up', 'Suboptimal control: BP 138/88 mmHg recorded in office.', 'Lisinopril adjusted and titrated upward to 10 mg daily. Home blood pressure log twice daily for 2 weeks. Later transitioned toward cardiology for episodic flutter.', 'West End Primary Care', 'finalized', NULL);
INSERT INTO encounters ("id", "patient_id", "doctor_name", "doctor_role", "practice", "occurred_on", "kind", "focus", "findings", "plan", "location", "status", "consultation_id") VALUES (6, 1, 'Dr. Sarah Jensen, MD', 'Interventional Cardiology', 'St. Jude Heart Pavilion', '2021-03-18', 'Interventional Cardiology', 'Diagnostic angiogram & DES to LAD', 'Single-vessel disease treated with a drug-eluting stent to the proximal LAD.', 'Dual antiplatelet therapy and cardiology follow-up established.', 'Catheterization Lab', 'finalized', NULL);
INSERT INTO vitals ("id", "patient_id", "recorded_at", "systolic", "diastolic", "heart_rate", "source", "note") VALUES (1, 1, '2024-10-20 08:10:00', 122, 78, 70, 'Omron home cuff', 'Morning reading');
INSERT INTO vitals ("id", "patient_id", "recorded_at", "systolic", "diastolic", "heart_rate", "source", "note") VALUES (2, 1, '2024-10-27 08:05:00', 126, 80, 72, 'Omron home cuff', 'Morning reading');
INSERT INTO vitals ("id", "patient_id", "recorded_at", "systolic", "diastolic", "heart_rate", "source", "note") VALUES (3, 1, '2024-11-03 08:20:00', 120, 76, 66, 'Omron home cuff', 'Morning reading');
INSERT INTO vitals ("id", "patient_id", "recorded_at", "systolic", "diastolic", "heart_rate", "source", "note") VALUES (4, 1, '2024-11-10 08:15:00', 124, 80, 68, 'Omron home cuff', 'Morning reading');
INSERT INTO vitals ("id", "patient_id", "recorded_at", "systolic", "diastolic", "heart_rate", "source", "note") VALUES (5, 1, '2024-11-17 08:30:00', 118, 76, 68, 'Omron home cuff', 'Morning reading');
INSERT INTO prescriptions ("id", "patient_id", "code", "prescriber", "specialty", "facility", "pharmacy", "ordered_at", "status", "auth_through", "course_label", "completes_on") VALUES (1, 1, 'RX-88412', 'Dr. Sarah Jensen, MD', 'Cardiology', 'Cardiology Outpatient Pavilion', 'CVS Pharmacy #4120 • 4th St & Broadway', '2024-10-24 09:30:00', 'active', 'Oct 2025', 'Ongoing long-term maintenance (authorized thru Oct 2025)', NULL);
INSERT INTO prescriptions ("id", "patient_id", "code", "prescriber", "specialty", "facility", "pharmacy", "ordered_at", "status", "auth_through", "course_label", "completes_on") VALUES (2, 1, 'RX-87904', 'Dr. Emily Watson, MD', 'Primary Care', 'West End Primary Care', 'CVS Pharmacy #4120 • 4th St & Broadway', '2024-09-28 14:15:00', 'active', 'Dec 2024', '6-month lipid therapy (re-evaluate Dec 2024)', NULL);
INSERT INTO prescriptions ("id", "patient_id", "code", "prescriber", "specialty", "facility", "pharmacy", "ordered_at", "status", "auth_through", "course_label", "completes_on") VALUES (3, 1, 'RX-86510', 'Dr. Marcus Vance, MD', 'Gastroenterology', 'Digestive Health Specialists', 'CVS Pharmacy #4120 • 4th St & Broadway', '2024-08-15 11:00:00', 'completed', NULL, '30-day completed course (ended Sep 14, 2024)', NULL);
INSERT INTO prescriptions ("id", "patient_id", "code", "prescriber", "specialty", "facility", "pharmacy", "ordered_at", "status", "auth_through", "course_label", "completes_on") VALUES (4, 1, 'RX-82190', 'Dr. Emily Watson, MD', 'Primary Care', 'West End Primary Care', 'CVS Pharmacy #4120 • 4th St & Broadway', '2024-06-10 16:45:00', 'ceased', NULL, 'Discontinued when rhythm therapy changed', NULL);
INSERT INTO prescription_items ("id", "prescription_id", "name", "strength", "form", "route", "frequency", "sig", "indication", "quantity", "supply_label", "refills", "schedule_slot", "schedule_detail", "remaining_label", "due_label", "sort_order", "completes_on") VALUES (1, 1, 'Apixaban (Eliquis)', '5 mg', 'Tablet', 'Oral', 'Twice daily', 'Take 1 tablet twice daily with or without food.', 'Prevents blood clots and lowers the risk of stroke associated with irregular heart rhythm.', 60, '30-day supply', '2 refills remaining', 'evening', 'Morning 8:00 AM and evening 8:00 PM', '48 capsules left', 'Due 8:00 PM', 0, NULL);
INSERT INTO prescription_items ("id", "prescription_id", "name", "strength", "form", "route", "frequency", "sig", "indication", "quantity", "supply_label", "refills", "schedule_slot", "schedule_detail", "remaining_label", "due_label", "sort_order", "completes_on") VALUES (2, 1, 'Metoprolol Succinate ER', '25 mg', 'Extended-release tablet', 'Oral', 'Once daily', 'Take 1 tablet once daily every morning.', 'Helps calm the heart, maintain steady heartbeat rhythm, and reduce episodes of sudden palpitations.', 90, '90-day supply', '3 refills', 'morning', 'Once daily with breakfast', '90 tablets remaining', 'Taken 8:00 AM', 1, NULL);
INSERT INTO prescription_items ("id", "prescription_id", "name", "strength", "form", "route", "frequency", "sig", "indication", "quantity", "supply_label", "refills", "schedule_slot", "schedule_detail", "remaining_label", "due_label", "sort_order", "completes_on") VALUES (3, 1, 'Aspirin (Enteric Coated)', '81 mg', 'Low-dose tablet', 'Oral', 'Once daily', 'Take 1 tablet once daily with meals.', 'Protects arteries and maintains smooth blood flow as routine preventive cardiology care.', 100, 'Over-the-counter Rx order', 'As directed', 'lunch', 'Once daily with lunch', '100 tablets', 'Taken 12:30 PM', 2, NULL);
INSERT INTO prescription_items ("id", "prescription_id", "name", "strength", "form", "route", "frequency", "sig", "indication", "quantity", "supply_label", "refills", "schedule_slot", "schedule_detail", "remaining_label", "due_label", "sort_order", "completes_on") VALUES (4, 2, 'Atorvastatin Calcium', '20 mg', 'Oral tablet', 'Oral', 'Bedtime', 'Take 1 tablet daily at bedtime.', 'Cholesterol control and LDL plaque stabilization.', 90, '90-day supply', '2 refills left', 'bedtime', 'Daily at bedtime', NULL, NULL, 0, NULL);
INSERT INTO prescription_items ("id", "prescription_id", "name", "strength", "form", "route", "frequency", "sig", "indication", "quantity", "supply_label", "refills", "schedule_slot", "schedule_detail", "remaining_label", "due_label", "sort_order", "completes_on") VALUES (5, 3, 'Pantoprazole Sodium', '40 mg', 'Delayed-release tablet', 'Oral', 'Once daily', 'Took 1 tablet once daily 30 minutes before the first meal.', 'Acid reflux management and protection against medication-related gastritis.', 30, 'Course finished', '0', NULL, NULL, NULL, NULL, 0, NULL);
INSERT INTO prescription_items ("id", "prescription_id", "name", "strength", "form", "route", "frequency", "sig", "indication", "quantity", "supply_label", "refills", "schedule_slot", "schedule_detail", "remaining_label", "due_label", "sort_order", "completes_on") VALUES (6, 4, 'Lisinopril', '10 mg', 'Tablet', 'Oral', 'Once daily', 'Previously 1 tablet daily.', 'Blood pressure. Switched toward metoprolol.', 30, 'Discontinued', '0', NULL, NULL, NULL, NULL, 0, NULL);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (1, 'Apixaban (Eliquis)', 'Prevents blood clots and lowers the risk of stroke associated with irregular heart rhythm.', '{"2":{"name":"Dr. Sarah Jensen","times":1}}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (2, 'Metoprolol Succinate ER', 'Helps calm the heart, maintain steady heartbeat rhythm, and reduce episodes of sudden palpitations.', '{"2":{"name":"Dr. Sarah Jensen","times":1}}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (3, 'Aspirin (Enteric Coated)', 'Protects arteries and maintains smooth blood flow as routine preventive cardiology care.', '{"2":{"name":"Dr. Sarah Jensen","times":1}}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (4, 'Atorvastatin Calcium', 'Cholesterol control and LDL plaque stabilization.', '{"7":{"name":"Dr. Emily Watson","times":1}}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (5, 'Pantoprazole Sodium', 'Acid reflux management and protection against medication-related gastritis.', '{"8":{"name":"Dr. Marcus Vance","times":1}}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (6, 'Lisinopril', 'Blood pressure. Switched toward metoprolol.', '{"7":{"name":"Dr. Emily Watson","times":1}}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (7, 'Amlodipine', 'Calcium-channel blocker for blood pressure and angina.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (8, 'Losartan', 'Angiotensin receptor blocker for blood pressure and heart protection.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (9, 'Hydrochlorothiazide', 'Thiazide diuretic for blood pressure and fluid retention.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (10, 'Metformin', 'Lowers blood glucose in type 2 diabetes.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (11, 'Levothyroxine', 'Thyroid hormone replacement.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (12, 'Omeprazole', 'Proton pump inhibitor for acid reflux.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (13, 'Amoxicillin', 'Penicillin antibiotic for bacterial infection.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (14, 'Ibuprofen', 'Anti-inflammatory for pain and fever.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (15, 'Clopidogrel', 'Antiplatelet agent that lowers clot risk after stenting.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (16, 'Furosemide', 'Loop diuretic for fluid overload and heart failure.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (17, 'Rosuvastatin', 'Statin for cholesterol lowering.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (18, 'Warfarin', 'Anticoagulant for clot prevention when monitored by INR.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (19, 'Gabapentin', 'Used for nerve pain and seizure control.', '{}'::jsonb);
INSERT INTO medicines ("id", "name", "description", "doctors") VALUES (20, 'Sertraline', 'SSRI for depression and anxiety.', '{}'::jsonb);
INSERT INTO dose_logs ("id", "patient_id", "item_name", "slot", "label", "status", "log_date") VALUES (1, 1, 'Morning medicines', 'morning', 'Morning 8:00 AM • Done', 'taken', '2024-11-17');
INSERT INTO dose_logs ("id", "patient_id", "item_name", "slot", "label", "status", "log_date") VALUES (2, 1, 'Aspirin (Enteric Coated)', 'lunch', 'With lunch 12:30 PM • Done', 'taken', '2024-11-17');
INSERT INTO dose_logs ("id", "patient_id", "item_name", "slot", "label", "status", "log_date") VALUES (3, 1, 'Apixaban (Eliquis)', 'evening', 'Evening 8:00 PM • Due', 'due', '2024-11-17');
INSERT INTO labs ("id", "patient_id", "name", "category", "collected_on", "due_label", "facility", "status", "ordering_md", "specimen", "panel_id", "note", "acknowledged", "report_path") VALUES (1, 1, 'Complete Blood Count (CBC with Differential)', 'Hematology', '2024-10-25', NULL, 'Quest Diagnostics', 'completed', 'Dr. Sarah Jensen, MD', 'Venous whole blood, EDTA lavender top', 'CBC-99201-AUTO', 'All hematologic indices within healthy physiological limits. No evidence of anemia, leukocytosis, or thrombotic cytopenia. Cellular indices demonstrate baseline cardiovascular stability post-procedure.', FALSE, '/records/pid-4089/cbc.pdf');
INSERT INTO labs ("id", "patient_id", "name", "category", "collected_on", "due_label", "facility", "status", "ordering_md", "specimen", "panel_id", "note", "acknowledged", "report_path") VALUES (2, 1, 'Comprehensive Lipid Profile (Fasting)', 'Cardiovascular', '2024-09-29', NULL, 'Labcorp Regional', 'completed', 'Dr. Emily Watson, MD', 'Fasting serum', 'LIP-4410', 'LDL remains borderline. Mediterranean heart-healthy diet recommended.', FALSE, '/records/pid-4089/lipid.pdf');
INSERT INTO labs ("id", "patient_id", "name", "category", "collected_on", "due_label", "facility", "status", "ordering_md", "specimen", "panel_id", "note", "acknowledged", "report_path") VALUES (3, 1, 'Comprehensive Metabolic Panel (CMP-14 + hs-CRP)', 'Metabolic & Renal', '2024-08-16', NULL, 'Metropolitan Outpatient Lab', 'completed', 'Dr. Emily Watson, MD', 'Serum', 'CMP-14', 'Renal function and fasting glucose are optimal.', FALSE, '/records/pid-4089/cmp.pdf');
INSERT INTO labs ("id", "patient_id", "name", "category", "collected_on", "due_label", "facility", "status", "ordering_md", "specimen", "panel_id", "note", "acknowledged", "report_path") VALUES (4, 1, 'High-Sensitivity Cardiac Troponin T', 'Cardiac Biomarker', '2024-06-11', NULL, 'West End Rapid Lab', 'completed', 'Dr. Sarah Jensen, MD', 'Plasma', 'TNT-HS', 'Negative for myocardial injury.', FALSE, '/records/pid-4089/troponin.pdf');
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (1, 1, 'White Blood Cells (WBC)', 'Total leukocyte count', 6.8, NULL, 'K/uL', 4, 11, 'Normal', 0);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (2, 1, 'Red Blood Cells (RBC)', 'Erythrocyte concentration', 4.62, NULL, 'M/uL', 4.2, 5.4, 'Normal', 1);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (3, 1, 'Hemoglobin (Hgb)', 'Oxygen transport', 13.9, NULL, 'g/dL', 12, 16, 'Normal', 2);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (4, 1, 'Hematocrit (Hct)', 'Packed cell volume', 41.5, NULL, '%', 37, 47, 'Normal', 3);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (5, 1, 'Platelets', 'Thrombocytes', 242, NULL, 'K/uL', 150, 450, 'Normal', 4);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (6, 1, 'MCV', 'Mean cell volume', 89.8, NULL, 'fL', 80, 100, 'Normal', 5);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (7, 1, 'Neutrophils', 'Differential %', 58.2, NULL, '%', 40, 70, 'Normal', 6);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (8, 1, 'Lymphocytes', 'Immune defense', 31.4, NULL, '%', 20, 40, 'Normal', 7);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (9, 2, 'Total Cholesterol', NULL, 198, NULL, 'mg/dL', 0, 200, 'Normal', 0);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (10, 2, 'LDL-C', NULL, 114, NULL, 'mg/dL', 0, 100, 'Borderline', 1);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (11, 2, 'HDL-C', NULL, 56, NULL, 'mg/dL', 50, 90, 'Optimal', 2);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (12, 2, 'Triglycerides', NULL, 140, NULL, 'mg/dL', 0, 150, 'Normal', 3);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (13, 3, 'eGFR', NULL, NULL, '>90', 'mL/min', NULL, NULL, 'Optimal', 0);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (14, 3, 'Glucose', 'Fasting', 94, NULL, 'mg/dL', 70, 99, 'Optimal', 1);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (15, 3, 'hs-CRP', NULL, 1.2, NULL, 'mg/L', 0, 3, 'Normal', 2);
INSERT INTO lab_results ("id", "lab_id", "name", "detail", "value_num", "value_text", "unit", "ref_low", "ref_high", "flag", "sort_order") VALUES (16, 4, 'Troponin T', NULL, NULL, '<6', 'ng/L', NULL, NULL, 'Negative / Normal', 0);
INSERT INTO imaging_studies ("id", "patient_id", "modality", "title", "performed_on", "facility", "equipment", "radiologist", "protocol", "summary", "impression", "meta", "calcium_score", "patient_quote", "outlook", "vessels", "status", "image_path", "report_path") VALUES (1, 1, 'Cardiac CT', 'Cardiac CT Angiography (CCTA with Contrast)', '2024-10-26', 'St. Jude Cardiovascular Imaging Center', 'Somatom Force 2×192', 'Dr. Arthur Pendelton, MD', 'Retrospective ECG-gated CCTA', 'Mild non-obstructive calcified plaque in the proximal LAD (Agatston score: 42).', '1. Mild non-obstructive coronary artery disease (CAD-RADS 1): limited to the proximal LAD with mild calcification and minimal luminal compromise. 2. Stable myocardial morphology: normal LV chamber dimensions and preserved wall thickness. No gross ischemia or pericardial abnormalities.', '320 slices • 3D recon', 42, 'Noor, your CT scan shows that your major coronary arteries are open and healthy. There is a very mild area of plaque (15–20%) in one small section, which is typical for your age and completely stable. Your medication regimen provides great protection.', 'Scores under 100 reflect a low cardiovascular event probability over the next decade.', '[{"name":"Left Main (LMCA)","note":"Supplies about 70% of the left ventricle. Clear and open.","status":"Normal / Patent"},{"name":"LAD (Left Anterior Descending)","note":"Mild focal calcified plaque in the proximal segment. Preserved distal contrast flow.","status":"15–20% Stenosis"},{"name":"LCx (Circumflex)","note":"Supplies the lateral heart wall. Clear and open.","status":"Patent / No Plaque"},{"name":"RCA (Right Coronary)","note":"Supplies the sinus node and right ventricle. Clear and open.","status":"Patent / Dominant"}]'::jsonb, 'final', '/records/pid-4089/ccta.png', '/records/pid-4089/ccta.pdf');
INSERT INTO imaging_studies ("id", "patient_id", "modality", "title", "performed_on", "facility", "equipment", "radiologist", "protocol", "summary", "impression", "meta", "calcium_score", "patient_quote", "outlook", "vessels", "status", "image_path", "report_path") VALUES (2, 1, 'Echo / Ultrasound', 'Transthoracic Echocardiogram (TTE - 2D/Doppler)', '2024-09-14', 'West End Diagnostic Imaging', NULL, 'Dr. Ronald Hayes, MD', NULL, 'Normal LV systolic function, LVEF 62%, trace mitral regurgitation.', 'Preserved ejection fraction, normal wall motion, trace physiological mitral regurgitation.', '24 cine loops • color flow', NULL, NULL, NULL, '[]'::jsonb, 'final', '/records/pid-4089/echo.png', '/records/pid-4089/echo.pdf');
INSERT INTO imaging_studies ("id", "patient_id", "modality", "title", "performed_on", "facility", "equipment", "radiologist", "protocol", "summary", "impression", "meta", "calcium_score", "patient_quote", "outlook", "vessels", "status", "image_path", "report_path") VALUES (3, 1, 'X-Ray', '2-View PA & Lateral Chest Radiograph', '2024-06-12', 'Metropolitan Health Radiology', NULL, NULL, NULL, 'Clear lung fields, normal cardiothoracic ratio, no active cardiopulmonary disease.', 'No acute cardiopulmonary process.', '2 high-resolution views (PA / lateral)', NULL, NULL, NULL, '[]'::jsonb, 'final', '/records/pid-4089/cxr.png', '/records/pid-4089/cxr.pdf');
INSERT INTO care_orders ("id", "patient_id", "kind", "title", "ordered_by", "status", "schedule_label", "facility", "instructions") VALUES (1, 1, 'diagnostic', '12-Lead Ambulatory ECG / Holter Monitor', 'Dr. Sarah Jensen, MD', 'Pending clinic visit', 'Scheduled: Nov 21, 2024 (during upcoming visit)', 'St. Jude Heart Pavilion', 'Wear comfortable loose two-piece clothing; avoid oily lotions or powders on the chest prior to placement.');
INSERT INTO care_orders ("id", "patient_id", "kind", "title", "ordered_by", "status", "schedule_label", "facility", "instructions") VALUES (2, 1, 'lab', 'Fasting Lipid Panel & hs-CRP Blood Draw', 'Dr. Emily Watson, MD (PCP)', 'Lab requisition issued', 'Due by: Dec 05, 2024', 'Quest Diagnostics (walk-in or booked)', '12-hour overnight fasting required; plain water permitted and encouraged for vein hydration.');
INSERT INTO invoices ("id", "patient_id", "code", "title", "issued_on", "due_on", "status", "insurance_note", "patient_due", "paid_via", "paid_on") VALUES (1, 1, 'INV-2024-1184', 'Cardiology Follow-up', '2024-11-14', '2024-12-14', 'pending', 'Insurance covered (80% BlueCross PPO)', 20, NULL, NULL);
INSERT INTO invoices ("id", "patient_id", "code", "title", "issued_on", "due_on", "status", "insurance_note", "patient_due", "paid_via", "paid_on") VALUES (2, 1, 'INV-2024-0942', 'Cardiac CT Scan Copay', '2024-10-26', NULL, 'paid', 'Paid via Apple Pay on Oct 27, 2024', 35, 'Apple Pay', '2024-10-27');
INSERT INTO invoices ("id", "patient_id", "code", "title", "issued_on", "due_on", "status", "insurance_note", "patient_due", "paid_via", "paid_on") VALUES (3, 1, 'INV-2024-0810', 'Echocardiogram Facility Copay', '2024-09-14', NULL, 'paid', 'Paid via Visa •••• 4210 on Sep 15, 2024', 45, 'Visa •••• 4210', '2024-09-15');
INSERT INTO invoices ("id", "patient_id", "code", "title", "issued_on", "due_on", "status", "insurance_note", "patient_due", "paid_via", "paid_on") VALUES (4, 1, 'INV-2024-0701', 'Annual Lab Panel Copay', '2024-06-10', NULL, 'paid', 'Direct account settlement', 15, 'Direct account', '2024-06-12');
INSERT INTO invoice_lines ("id", "invoice_id", "description", "amount") VALUES (1, 1, 'Doctor consultation fee', 80);
INSERT INTO invoice_lines ("id", "invoice_id", "description", "amount") VALUES (2, 1, 'In-clinic diagnostic / pre-analysis', 20);
INSERT INTO invoice_lines ("id", "invoice_id", "description", "amount") VALUES (3, 1, 'Insurance covered (80% BlueCross PPO)', -80);
INSERT INTO referrals ("id", "patient_id", "from_doctor_id", "to_doctor_id", "source_consult_id", "order_id", "follow_consult_id", "note", "status", "created_at") VALUES (1, 1, 1, 2, NULL, NULL, NULL, 'Palpitations and chest awareness for cardiology review on Nov 21.', 'incoming', '2024-11-17 13:40:00');
INSERT INTO referrals ("id", "patient_id", "from_doctor_id", "to_doctor_id", "source_consult_id", "order_id", "follow_consult_id", "note", "status", "created_at") VALUES (2, 1, 1, 2, NULL, NULL, 4, 'Palpitations for cardiology review', 'in_session', '2026-10-28 14:28:52');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (1, 1, 1, 'granted', 'qr', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (2, 2, 1, 'granted', 'primary', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (3, 3, 1, 'granted', 'primary', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (4, 4, 1, 'granted', 'primary', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (5, 5, 1, 'granted', 'primary', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (6, 6, 1, 'granted', 'primary', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (7, 7, 1, 'granted', 'primary', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (12, 3, 2, 'granted', 'appointment', '2024-11-17 08:00:00');
INSERT INTO patient_access ("id", "patient_id", "doctor_id", "status", "source", "created_at") VALUES (21, 1, 2, 'granted', 'code', '2026-10-28 15:05:04');
INSERT INTO access_codes ("id", "patient_id", "code", "created_at", "expires_at", "used_at", "used_by") VALUES (1, 1, 'V2UH-JQX2', '2026-10-28 15:03:27', '2026-10-29 15:03:27', '2026-10-28 15:05:55', 2);
INSERT INTO access_codes ("id", "patient_id", "code", "created_at", "expires_at", "used_at", "used_by") VALUES (2, 1, 'NAM7-PEZH', '2026-10-28 15:16:33', '2026-10-29 15:16:33', NULL, NULL);
INSERT INTO self_reports ("id", "patient_id", "occurred_on", "title", "detail", "duration", "severity", "meds_taken", "ongoing", "created_at") VALUES (1, 1, '2026-10-28', 'Bad headache after a fall', 'Throbbing on the left side after slipping on the stairs. Nausea for the first hour.', 'About 3 hours', 'moderate', 'Ibuprofen 200 mg', TRUE, '2026-10-28 15:10:45');
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (1, 3, 'Evening dose due', 'Apixaban 5 mg is due at 8:00 PM.', '2024-11-17 12:00:00', NULL);
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (2, 3, 'Holter visit', 'Your monitor is placed during the Nov 21 visit with Dr. Sarah Jensen.', '2024-11-16 09:00:00', '2024-11-16 18:10:00');
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (3, 1, 'Chart ready', 'Noor Yadallee is checked in for the 2:15 PM review.', '2024-11-17 13:50:00', '2026-10-28 19:12:47');
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (4, 2, 'Referral received', 'Dr. Irfan Ameerudden referred Noor Yadallee for a cardiology review on Nov 21.', '2024-11-17 13:40:00', NULL);
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (5, 2, 'Incoming referral', 'Dr. Irfan Ameerudden referred Noor Yadallee (PID-4089). Palpitations for cardiology review', '2026-10-28 14:28:52', NULL);
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (6, 3, 'Record access request', 'Dr. Sarah Jensen is asking to open your medical record. Allow or deny this from your home page, Notifications, or My physicians.', '2026-10-28 15:05:04', NULL);
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (7, 2, 'Record access allowed', 'Noor Yadallee (PID-4089) allowed you to open their medical record.', '2026-10-28 15:05:19', NULL);
INSERT INTO notifications ("id", "user_id", "title", "body", "created_at", "seen_at") VALUES (8, 3, 'Record access granted', 'Dr. Sarah Jensen used your access code and can now view your full medical history.', '2026-10-28 15:05:55', NULL);
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('0b3acc7271105ef93da4c7aaf5d504035998c12faee56a8eaa8e696b0574b43a', 1, '2026-11-11 14:37:52.753026');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('10eddfc1e6369405915dd4032b3afcb63922dfb182eb6501f0270f8f27b431e9', 1, '2026-11-11 09:52:20.912031');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('13ae72d5d28277b319265c3578c6f2a6172896c3f6631806a3fbf57f16e3a115', 3, '2026-11-11 13:44:29.975751');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('161c6d68d069e727ba681e0b111d8a76a14c962d49a72a56d1bb1c07c5f006fd', 1, '2026-11-11 12:53:48.161933');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('1ea87f6c7fed1b0d0bc525da9e147b4a92c9db2f014918ac5f121da87ffc7114', 1, '2026-11-11 14:28:06.44729');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('3cceb2edd71bc6b40e6ce2f7b079f2d18178396858f8d2cf2ca037f3780f2f73', 1, '2026-11-11 12:51:16.736761');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('49fac7cfad4e8361347b6aec3650437ece2d4ec6042717d1e3132952fb8ba65b', 1, '2026-11-11 11:10:58.46101');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('4cc1070869619c7aa713ee7b046ee6958868d83b07fac1cce94ca4eb2bfa5f43', 1, '2026-11-11 12:37:34.903884');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('5400aeeeec406fa6570e733a4a0c33b09f2501dd2305cd6810041c2350205fbf', 3, '2026-11-11 14:34:49.403706');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('5420a5b8ef77f2f3b02bebc42317f4204c237e967119b8941d77e6c29da1f7e7', 1, '2026-11-11 13:37:07.330239');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('61f06333eea6394bd73720366a1da1fb08cf5c6e965418e65d0876dd10083302', 2, '2026-11-11 10:29:07.212278');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('67209c15257ab2a06c11b2006d78b32fbe4831bff815f41fc2b840018f8aed8a', 1, '2026-11-11 11:16:11.289742');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('6af7d030dcfea6cf7f12913f7647909b52eca92f93aa1c6f86d9c9150507a71b', 3, '2026-11-11 12:37:32.933607');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('722808fe9b3bf37e23c6abc61efb7107c60a92978ce301efa42b8c5810b4a0d9', 1, '2026-11-11 13:26:45.30119');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('809044a7db4694aa3de932f345631140143733db59537288b0a4d68a9ea3c39c', 1, '2026-11-11 13:38:55.60207');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('83a09a5d6c6e20aedd9788d6b8379cf1ebf953f368c6788ce6b34e54be5167ae', 1, '2026-11-11 11:50:20.839027');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('845365b97c87490d954590e94e95bb0049e1b83452a49ee0189cf653d1593b4d', 3, '2026-11-11 09:49:40.074996');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('8bd4f855b736b050de85fcc9dbb99faa602ffab75bb051895339f86c8a43464e', 1, '2026-11-11 09:52:14.908974');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('a5ac1b2bf82fe042ad90ab0abcd4a2fa5e81fc14121360d9b0a726a8da455202', 3, '2026-11-11 13:23:18.74545');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('c24ba0686a3648d0fbeb1880ee885a63135aadac5c20fa39c22eae4bcb01e6d6', 1, '2026-11-11 10:01:10.833876');
INSERT INTO sessions ("id", "user_id", "expires_at") VALUES ('e817d3b39a3c31dff4560ad9a8319bf73625a22dfdb517cd105789e314bbe6a3', 1, '2026-11-11 12:06:14.801779');
INSERT INTO practice_metrics ("id", "sort_order", "label", "value", "caption", "delta") VALUES (1, 1, 'Monthly Encounters', '164', 'Pacing 108% of target', '+14%');
INSERT INTO practice_metrics ("id", "sort_order", "label", "value", "caption", "delta") VALUES (2, 2, 'Avg Consultation', '21 min', 'Benchmark ≤ 25 min', 'Optimal');
INSERT INTO practice_metrics ("id", "sort_order", "label", "value", "caption", "delta") VALUES (3, 3, 'Diagnostic Conversions', '48', 'Yield ratio 29.2% of intake', '+6 vs prev');
INSERT INTO practice_metrics ("id", "sort_order", "label", "value", "caption", "delta") VALUES (4, 4, 'Telemetry Fulfillment', '98.6%', 'Panels zero backlogged', '100% SLA');
INSERT INTO modality_volumes ("id", "sort_order", "name", "units", "share") VALUES (1, 1, 'Transthoracic Echo', 46, 32.4);
INSERT INTO modality_volumes ("id", "sort_order", "name", "units", "share") VALUES (2, 2, '24h Holter Monitoring', 38, 26.8);
INSERT INTO modality_volumes ("id", "sort_order", "name", "units", "share") VALUES (3, 3, 'Cardiac CT Angiography', 24, 16.9);
INSERT INTO modality_volumes ("id", "sort_order", "name", "units", "share") VALUES (4, 4, 'Stress Treadmill Test', 19, 13.4);
INSERT INTO modality_volumes ("id", "sort_order", "name", "units", "share") VALUES (5, 5, 'Advanced Lipid Panels', 15, 10.5);
INSERT INTO cohorts ("id", "sort_order", "name", "patients", "share") VALUES (1, 1, 'Hypertension', 62, 38);
INSERT INTO cohorts ("id", "sort_order", "name", "patients", "share") VALUES (2, 2, 'CAD / Post-PCI', 48, 29);
INSERT INTO cohorts ("id", "sort_order", "name", "patients", "share") VALUES (3, 3, 'Arrhythmia / AFib', 34, 21);
INSERT INTO cohorts ("id", "sort_order", "name", "patients", "share") VALUES (4, 4, 'Preventive', 20, 12);
INSERT INTO referral_sources ("id", "sort_order", "name", "channel", "share", "patients") VALUES (1, 1, 'Direct • Concierge Intake', 'Executive Health Network', 45.3, 24);
INSERT INTO referral_sources ("id", "sort_order", "name", "channel", "share", "patients") VALUES (2, 2, 'Dr. K. Miller', 'Internal Medicine Specialists', 26.4, 14);
INSERT INTO referral_sources ("id", "sort_order", "name", "channel", "share", "patients") VALUES (3, 3, 'Dr. Aris Thorne', 'Thorne Interventional Endocrine', 17, 9);
INSERT INTO referral_sources ("id", "sort_order", "name", "channel", "share", "patients") VALUES (4, 4, 'Dr. Julian Vance', 'Sports Physiology & Geriatrics', 11.3, 6);
INSERT INTO practice_notes ("id", "body") VALUES (1, 'Elevated post-PCI diagnostic conversions triggered 18 Holter telemetry dispatches this cycle.');

SELECT setval(pg_get_serial_sequence('access_codes', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM access_codes), 1), 1));
SELECT setval(pg_get_serial_sequence('appointments', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM appointments), 1), 1));
SELECT setval(pg_get_serial_sequence('availability', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM availability), 1), 1));
SELECT setval(pg_get_serial_sequence('care_orders', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM care_orders), 1), 1));
SELECT setval(pg_get_serial_sequence('cohorts', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM cohorts), 1), 1));
SELECT setval(pg_get_serial_sequence('consultation_entries', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM consultation_entries), 1), 1));
SELECT setval(pg_get_serial_sequence('consultation_orders', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM consultation_orders), 1), 1));
SELECT setval(pg_get_serial_sequence('consultations', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM consultations), 1), 1));
SELECT setval(pg_get_serial_sequence('doctors', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM doctors), 1), 1));
SELECT setval(pg_get_serial_sequence('dose_logs', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM dose_logs), 1), 1));
SELECT setval(pg_get_serial_sequence('encounters', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM encounters), 1), 1));
SELECT setval(pg_get_serial_sequence('imaging_studies', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM imaging_studies), 1), 1));
SELECT setval(pg_get_serial_sequence('invoice_lines', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM invoice_lines), 1), 1));
SELECT setval(pg_get_serial_sequence('invoices', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM invoices), 1), 1));
SELECT setval(pg_get_serial_sequence('lab_results', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM lab_results), 1), 1));
SELECT setval(pg_get_serial_sequence('labs', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM labs), 1), 1));
SELECT setval(pg_get_serial_sequence('medicines', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM medicines), 1), 1));
SELECT setval(pg_get_serial_sequence('modality_volumes', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM modality_volumes), 1), 1));
SELECT setval(pg_get_serial_sequence('notifications', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM notifications), 1), 1));
SELECT setval(pg_get_serial_sequence('patient_access', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM patient_access), 1), 1));
SELECT setval(pg_get_serial_sequence('patient_tasks', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM patient_tasks), 1), 1));
SELECT setval(pg_get_serial_sequence('patients', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM patients), 1), 1));
SELECT setval(pg_get_serial_sequence('practice_metrics', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM practice_metrics), 1), 1));
SELECT setval(pg_get_serial_sequence('practice_notes', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM practice_notes), 1), 1));
SELECT setval(pg_get_serial_sequence('prescription_items', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM prescription_items), 1), 1));
SELECT setval(pg_get_serial_sequence('prescriptions', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM prescriptions), 1), 1));
SELECT setval(pg_get_serial_sequence('referral_sources', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM referral_sources), 1), 1));
SELECT setval(pg_get_serial_sequence('referrals', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM referrals), 1), 1));
SELECT setval(pg_get_serial_sequence('refill_requests', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM refill_requests), 1), 1));
SELECT setval(pg_get_serial_sequence('self_report_edits', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM self_report_edits), 1), 1));
SELECT setval(pg_get_serial_sequence('self_reports', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM self_reports), 1), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM users), 1), 1));
SELECT setval(pg_get_serial_sequence('vitals', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM vitals), 1), 1));

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE consultation_orders ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE consultation_orders ADD COLUMN IF NOT EXISTS tags text;
ALTER TABLE patient_tasks ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE patient_tasks ADD COLUMN IF NOT EXISTS order_uid text;
ALTER TABLE care_orders ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE care_orders ADD COLUMN IF NOT EXISTS consultation_uid text;
ALTER TABLE care_orders ADD COLUMN IF NOT EXISTS order_uid text;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS consultation_uid text;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS order_uid text;

CREATE UNIQUE INDEX IF NOT EXISTS consultations_uid_key ON consultations (uid);
CREATE UNIQUE INDEX IF NOT EXISTS consultation_orders_uid_key ON consultation_orders (uid);
CREATE UNIQUE INDEX IF NOT EXISTS patient_tasks_uid_key ON patient_tasks (uid);
CREATE UNIQUE INDEX IF NOT EXISTS care_orders_uid_key ON care_orders (uid);
CREATE UNIQUE INDEX IF NOT EXISTS labs_uid_key ON labs (uid);

COMMIT;
