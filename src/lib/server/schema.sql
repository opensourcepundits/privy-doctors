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

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS response_note text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS responded_at timestamp;

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

CREATE TABLE IF NOT EXISTS self_report_files (
  id serial PRIMARY KEY,
  report_id int NOT NULL REFERENCES self_reports(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  stored_name text NOT NULL,
  content_type text NOT NULL,
  created_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS prescription_photos (
  id serial PRIMARY KEY,
  consultation_id integer NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  stored_name text NOT NULL,
  content_type text NOT NULL,
  created_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS self_report_alerts (
  id serial PRIMARY KEY,
  report_id int NOT NULL REFERENCES self_reports(id) ON DELETE CASCADE,
  doctor_id int NOT NULL REFERENCES doctors(id),
  created_at timestamp NOT NULL,
  UNIQUE (report_id, doctor_id)
);
