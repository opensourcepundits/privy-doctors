-- Test doctor for /doctors/login
-- Email: test.doctor@clinica.privata
-- Password: testdoctor
-- Safe to run again. An existing account is left in place.

WITH new_user AS (
  INSERT INTO users (email, password_hash, role, name)
  VALUES (
    'test.doctor@clinica.privata',
    'e8d835c5a3ec0944a9f28b87fd6439b9:889a847e4ffd9c3c7024cc4a8d607e41ffd0a551e903813e2db6f88c85edbf56',
    'doctor',
    'Dr. Test Account'
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id
),
account AS (
  SELECT id FROM new_user
  UNION ALL
  SELECT id FROM users
  WHERE email = 'test.doctor@clinica.privata'
    AND NOT EXISTS (SELECT 1 FROM new_user)
),
new_doctor AS (
  INSERT INTO doctors (user_id, name, credentials, specialty, gender, practice, location, phone)
  SELECT
    id,
    'Dr. Test Account',
    'MD',
    'General Practice',
    'Female',
    'Test Practice',
    'Suite 100, Test Clinic',
    '(555) 010-0000'
  FROM account
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id
),
doctor AS (
  SELECT id FROM new_doctor
  UNION ALL
  SELECT doctors.id
  FROM doctors
  JOIN account ON doctors.user_id = account.id
  WHERE NOT EXISTS (SELECT 1 FROM new_doctor)
)
INSERT INTO availability (doctor_id, kind, weekday, start_time, end_time)
SELECT doctor.id, 'clinic', day.weekday, TIME '09:00', TIME '17:00'
FROM doctor
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS day(weekday)
WHERE NOT EXISTS (
  SELECT 1 FROM availability
  WHERE availability.doctor_id = doctor.id
    AND availability.kind = 'clinic'
    AND availability.weekday = day.weekday
);
