import { readFileSync } from 'node:fs';
import { scryptSync, randomBytes } from 'node:crypto';
import postgres from 'postgres';

const env = Object.fromEntries(
	readFileSync(new URL('../.env', import.meta.url), 'utf8')
		.split(/\r?\n/)
		.filter((line) => line && !line.startsWith('#'))
		.map((line) => {
			const index = line.indexOf('=');
			return [line.slice(0, index), line.slice(index + 1)];
		})
);

const sql = postgres(env.DATABASE_URL, {
	onnotice: () => {},
	types: {
		timestamp: {
			to: 1114,
			from: [1114],
			serialize: (value) => value,
			parse: (value) => value
		}
	}
});

function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 32).toString('hex');
	return `${salt}:${hash}`;
}

const password = hashPassword('clinic-demo');

await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await sql.unsafe(readFileSync(new URL('../src/lib/server/schema.sql', import.meta.url), 'utf8'));

const [doctorUser] = await sql`
	INSERT INTO users (email, password_hash, role, name)
	VALUES ('sarah.jensen@clinica.privata', ${password}, 'doctor', 'Dr. Sarah Jensen')
	RETURNING id
`;
const [patientUser] = await sql`
	INSERT INTO users (email, password_hash, role, name)
	VALUES ('eleanor.vance@clinica.privata', ${password}, 'patient', 'Eleanor Vance')
	RETURNING id
`;

const [doctor] = await sql`
	INSERT INTO doctors (user_id, name, credentials, specialty, gender, npi, practice, location, phone)
	VALUES (
		${doctorUser.id}, 'Dr. Sarah Jensen', 'MD, FACC', 'Cardiology', 'Female', '1982049182',
		'Private Practice • Cardiology Specialist',
		'Suite 410, St. Jude Heart Pavilion',
		'(555) 234-8990'
	)
	RETURNING id
`;

for (const weekday of [1, 2, 3, 4, 5]) {
	await sql`
		INSERT INTO availability (doctor_id, kind, weekday, start_time, end_time)
		VALUES (${doctor.id}, 'clinic', ${weekday}, '09:00', '17:00')
	`;
}
for (const weekday of [2, 4]) {
	await sql`
		INSERT INTO availability (doctor_id, kind, weekday, start_time, end_time)
		VALUES (${doctor.id}, 'home', ${weekday}, '18:00', '20:00')
	`;
}

const roster = [
	{
		name: 'Dr. Elena Rostova',
		credentials: 'MD, FACC',
		specialty: 'Cardiac Electrophysiology',
		gender: 'Female',
		practice: 'St. Jude Heart Clinic',
		location: 'Suite 418, St. Jude Heart Pavilion',
		phone: '(555) 234-8992',
		clinic: [[1, '09:00', '13:00'], [3, '09:00', '13:00'], [5, '09:00', '13:00']],
		home: []
	},
	{
		name: 'Dr. James Okonkwo',
		credentials: 'MD',
		specialty: 'Interventional Cardiology',
		gender: 'Male',
		practice: 'St. Jude Heart Pavilion',
		location: 'Suite 422, St. Jude Heart Pavilion',
		phone: '(555) 234-8994',
		clinic: [[2, '10:00', '16:00'], [4, '10:00', '16:00']],
		home: []
	},
	{
		name: 'Dr. Priya Shah',
		credentials: 'MD',
		specialty: 'Heart Failure',
		gender: 'Female',
		practice: 'St. Jude Heart Pavilion',
		location: 'Suite 406, St. Jude Heart Pavilion',
		phone: '(555) 234-8996',
		clinic: [[1, '13:00', '17:00'], [2, '13:00', '17:00'], [3, '13:00', '17:00'], [4, '13:00', '17:00']],
		home: [[3, '18:00', '20:00']]
	},
	{
		name: 'Dr. Marcus Hale',
		credentials: 'MD',
		specialty: 'Preventive Cardiology',
		gender: 'Male',
		practice: 'St. Jude Heart Pavilion',
		location: 'Suite 402, St. Jude Heart Pavilion',
		phone: '(555) 234-8998',
		clinic: [[5, '08:00', '12:00']],
		home: []
	}
];

for (const clinician of roster) {
	const [created] = await sql`
		INSERT INTO doctors (name, credentials, specialty, gender, practice, location, phone)
		VALUES (
			${clinician.name}, ${clinician.credentials}, ${clinician.specialty}, ${clinician.gender},
			${clinician.practice}, ${clinician.location}, ${clinician.phone}
		)
		RETURNING id
	`;
	for (const [weekday, start, end] of clinician.clinic) {
		await sql`
			INSERT INTO availability (doctor_id, kind, weekday, start_time, end_time)
			VALUES (${created.id}, 'clinic', ${weekday}, ${start}, ${end})
		`;
	}
	for (const [weekday, start, end] of clinician.home) {
		await sql`
			INSERT INTO availability (doctor_id, kind, weekday, start_time, end_time)
			VALUES (${created.id}, 'home', ${weekday}, ${start}, ${end})
		`;
	}
}

const people = [
	{
		userId: patientUser.id,
		pid: 'PID-4089',
		first: 'Eleanor',
		last: 'Vance',
		dob: '1956-04-12',
		sex: 'Female',
		blood: 'A+',
		allergies: ['Penicillin (mild hives)', 'NSAIDs', 'Shellfish (moderate)'],
		conditions: ['Atrial fibrillation (paroxysmal)', 'Mild CAD s/p DES to LAD', 'Hyperlipidemia'],
		surgeries: [
			{ year: '2021', name: 'Diagnostic angiogram' },
			{ year: '1998', name: 'Appendectomy' }
		],
		phone: '(555) 014-4089',
		note: 'Concierge Primary',
		insurance: ['BlueCross BlueShield Premier Care PPO', 'BC-88902', 'EV-940283'],
		pharmacy: ['CVS Pharmacy #4120', '4th St & Broadway', '(555) 234-8901']
	},
	{
		pid: 'PID-3921',
		first: 'Arthur',
		last: 'Pendelton',
		dob: '1970-03-02',
		sex: 'Male',
		blood: 'O+',
		allergies: [],
		conditions: ['Hyperlipidemia'],
		surgeries: [],
		note: 'Established',
		insurance: [null, null, null],
		pharmacy: [null, null, null]
	},
	{
		pid: 'PID-5104',
		first: 'Clara',
		last: 'Oswald',
		dob: '1982-06-01',
		sex: 'Female',
		blood: 'B+',
		allergies: [],
		conditions: [],
		surgeries: [],
		note: 'New patient',
		insurance: [null, null, null],
		pharmacy: [null, null, null]
	},
	{
		pid: 'PID-6204',
		first: 'Marcus',
		last: 'Brody',
		dob: '1979-01-15',
		sex: 'Male',
		blood: 'A-',
		allergies: [],
		conditions: ['Hypertension'],
		surgeries: [],
		note: 'Home BP log',
		insurance: [null, null, null],
		pharmacy: [null, null, null]
	},
	{
		pid: 'PID-7891',
		first: 'Sophia',
		last: 'Chen',
		dob: '1985-09-09',
		sex: 'Female',
		blood: 'AB+',
		allergies: [],
		conditions: ['Elevated ApoB'],
		surgeries: [],
		note: 'Preventive',
		insurance: [null, null, null],
		pharmacy: [null, null, null]
	},
	{
		pid: 'PID-3312',
		first: 'David',
		last: 'Miller',
		dob: '1963-02-20',
		sex: 'Male',
		blood: 'O-',
		allergies: ['Contrast dye'],
		conditions: ['CAD s/p angioplasty'],
		surgeries: [{ year: '2024', name: 'Angioplasty' }],
		note: 'Post-procedure',
		insurance: [null, null, null],
		pharmacy: [null, null, null]
	},
	{
		pid: 'PID-4410',
		first: 'Helen',
		last: 'Cho',
		dob: '1967-08-08',
		sex: 'Female',
		blood: 'B-',
		allergies: [],
		conditions: ['ICD follow-up'],
		surgeries: [],
		note: 'Device clinic',
		insurance: [null, null, null],
		pharmacy: [null, null, null]
	}
];

const ids = {};
for (const person of people) {
	const [row] = await sql`
		INSERT INTO patients (
			user_id, primary_doctor_id, pid, first_name, last_name, dob, sex, blood_type,
			allergies, conditions, surgeries, phone, concierge_note,
			insurance_name, insurance_group, insurance_member,
			pharmacy_name, pharmacy_address, pharmacy_phone
		) VALUES (
			${person.userId ?? null}, ${doctor.id}, ${person.pid}, ${person.first}, ${person.last},
			${person.dob}, ${person.sex}, ${person.blood}, ${sql.json(person.allergies)},
			${sql.json(person.conditions)}, ${sql.json(person.surgeries)}, ${person.phone ?? null},
			${person.note}, ${person.insurance[0]}, ${person.insurance[1]}, ${person.insurance[2]},
			${person.pharmacy[0]}, ${person.pharmacy[1]}, ${person.pharmacy[2]}
		)
		RETURNING id
	`;
	ids[person.pid] = row.id;
}

const visits = [
	['PID-4089', '2024-11-17 14:15:00', 45, 'Arrhythmia Review', 'Atrial fibrillation follow-up & Holter monitor review', 'scheduled', 'Last visit: 3 weeks ago'],
	['PID-3921', '2024-11-17 15:00:00', 30, 'Routine Check', 'Lipid panel review & statin refill', 'scheduled', 'Last visit: 3 months ago'],
	['PID-5104', '2024-11-17 15:45:00', 45, 'New Patient', 'Palpitations & ECG evaluation', 'scheduled', 'First appointment'],
	['PID-6204', '2024-11-17 16:30:00', 30, 'Hypertension Check', 'ACE inhibitor titration & BP log review', 'scheduled', 'Last visit: 1 month ago'],
	['PID-7891', '2024-11-17 17:15:00', 30, 'Lab Review', 'ApoB & Lp(a) risk stratification follow-up', 'scheduled', 'Last visit: 2 weeks ago'],
	['PID-3312', '2024-11-17 17:45:00', 30, 'Post-Procedure', 'Post-angioplasty 30-day assessment & dual antiplatelet check', 'scheduled', 'Last visit: 1 month ago'],
	['PID-4410', '2024-11-17 18:30:00', 20, 'Device Check', 'ICD interrogation & battery review', 'scheduled', 'Last visit: 6 months ago'],
	['PID-4089', '2024-11-21 14:15:00', 45, 'Arrhythmia Follow-up & 12-Lead ECG Review', 'Holter placement and rhythm review', 'scheduled', null]
];

for (const visit of visits) {
	await sql`
		INSERT INTO appointments (patient_id, doctor_id, starts_at, duration_min, title, reason, status, location, last_visit_label)
		VALUES (
			${ids[visit[0]]}, ${doctor.id}, ${visit[1]}, ${visit[2]}, ${visit[3]}, ${visit[4]}, ${visit[5]},
			'Suite 410, St. Jude Heart Pavilion (Valet parking at West Gate)', ${visit[6]}
		)
	`;
}

const encounters = [
	['2024-11-14', 'Dr. Sarah Jensen, MD', 'General Visit', 'Solo Practice Follow-up • Cardiology & Wellness', 'Routine health maintenance', 'Blood pressure 124/80 mmHg. Patient reports reduced palpitations and stable recovery. General status excellent.', 'Continue current medication plan; routine metabolic panel reassessment in 6 months.', 'Cardiology Pavilion'],
	['2024-10-24', 'Dr. Sarah Jensen, MD', 'Cardiology Consult', 'Cardiology & Concierge Solo Practice', 'Palpitation evaluation & EKG', 'Sinus rhythm with premature atrial contractions (PACs).', 'Initiated metoprolol succinate 25 mg daily for palpitation suppression. Ordered 12-lead Holter monitoring (48-hr).', 'Cardiology Suite #4'],
	['2024-09-28', 'Dr. Emily Watson, MD', 'Primary Care / PCP', 'Comprehensive Family & Preventive Health', 'Annual comprehensive wellness & lipid evaluation', 'Mild hyperlipidemia, elevated LDL (142 mg/dL).', 'Prescribed atorvastatin 20 mg daily at bedtime. Structured dietary counseling and cardiovascular lifestyle guidelines provided.', 'Wellness Clinic'],
	['2024-08-15', 'Dr. Marcus Vance, MD', 'Gastroenterology', 'Digestive Health & Endoscopy Associates', 'GI consult: atypical epigastric burning & dyspepsia', 'Mild GERD, negative for H. pylori antigen.', 'Prescribed pantoprazole 40 mg once daily before breakfast for 4 weeks. Avoid late-evening meals and triggers.', 'GI Endoscopy Registry'],
	['2024-06-10', 'Dr. Emily Watson, MD', 'Primary Care / PCP', 'Hypertension Management Clinic', 'Hypertension management follow-up', 'Suboptimal control: BP 138/88 mmHg recorded in office.', 'Lisinopril adjusted and titrated upward to 10 mg daily. Home blood pressure log twice daily for 2 weeks. Later transitioned toward cardiology for episodic flutter.', 'West End Primary Care'],
	['2021-03-18', 'Dr. Sarah Jensen, MD', 'Interventional Cardiology', 'St. Jude Heart Pavilion', 'Diagnostic angiogram & DES to LAD', 'Single-vessel disease treated with a drug-eluting stent to the proximal LAD.', 'Dual antiplatelet therapy and cardiology follow-up established.', 'Catheterization Lab']
];

for (const row of encounters) {
	await sql`
		INSERT INTO encounters (patient_id, doctor_name, doctor_role, practice, occurred_on, kind, focus, findings, plan, location, status)
		VALUES (${ids['PID-4089']}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[0]}, ${row[2]}, ${row[4]}, ${row[5]}, ${row[6]}, ${row[7]}, 'finalized')
	`;
}

const readings = [
	['2024-10-20 08:10:00', 122, 78, 70],
	['2024-10-27 08:05:00', 126, 80, 72],
	['2024-11-03 08:20:00', 120, 76, 66],
	['2024-11-10 08:15:00', 124, 80, 68],
	['2024-11-17 08:30:00', 118, 76, 68]
];
for (const reading of readings) {
	await sql`
		INSERT INTO vitals (patient_id, recorded_at, systolic, diastolic, heart_rate, source, note)
		VALUES (${ids['PID-4089']}, ${reading[0]}, ${reading[1]}, ${reading[2]}, ${reading[3]}, 'Omron home cuff', 'Morning reading')
	`;
}

async function rx(code, prescriber, specialty, facility, at, status, auth, course, items) {
	const [row] = await sql`
		INSERT INTO prescriptions (patient_id, code, prescriber, specialty, facility, pharmacy, ordered_at, status, auth_through, course_label)
		VALUES (
			${ids['PID-4089']}, ${code}, ${prescriber}, ${specialty}, ${facility},
			'CVS Pharmacy #4120 • 4th St & Broadway', ${at}, ${status}, ${auth}, ${course}
		)
		RETURNING id
	`;
	for (const [index, item] of items.entries()) {
		await sql`
			INSERT INTO prescription_items (
				prescription_id, name, strength, form, route, frequency, sig, indication, quantity,
				supply_label, refills, schedule_slot, schedule_detail, remaining_label, due_label, sort_order
			) VALUES (
				${row.id}, ${item.name}, ${item.strength}, ${item.form}, ${item.route ?? 'Oral'},
				${item.frequency}, ${item.sig}, ${item.indication}, ${item.quantity ?? null},
				${item.supply}, ${item.refills}, ${item.slot ?? null}, ${item.schedule ?? null},
				${item.remaining ?? null}, ${item.due ?? null}, ${index}
			)
		`;
	}
}

await rx('RX-88412', 'Dr. Sarah Jensen, MD', 'Cardiology', 'Cardiology Outpatient Pavilion', '2024-10-24 09:30:00', 'active', 'Oct 2025', 'Ongoing long-term maintenance (authorized thru Oct 2025)', [
	{ name: 'Apixaban (Eliquis)', strength: '5 mg', form: 'Tablet', frequency: 'Twice daily', sig: 'Take 1 tablet twice daily with or without food.', indication: 'Prevents blood clots and lowers the risk of stroke associated with irregular heart rhythm.', quantity: 60, supply: '30-day supply', refills: '2 refills remaining', slot: 'evening', schedule: 'Morning 8:00 AM and evening 8:00 PM', remaining: '48 capsules left', due: 'Due 8:00 PM' },
	{ name: 'Metoprolol Succinate ER', strength: '25 mg', form: 'Extended-release tablet', frequency: 'Once daily', sig: 'Take 1 tablet once daily every morning.', indication: 'Helps calm the heart, maintain steady heartbeat rhythm, and reduce episodes of sudden palpitations.', quantity: 90, supply: '90-day supply', refills: '3 refills', slot: 'morning', schedule: 'Once daily with breakfast', remaining: '90 tablets remaining', due: 'Taken 8:00 AM' },
	{ name: 'Aspirin (Enteric Coated)', strength: '81 mg', form: 'Low-dose tablet', frequency: 'Once daily', sig: 'Take 1 tablet once daily with meals.', indication: 'Protects arteries and maintains smooth blood flow as routine preventive cardiology care.', quantity: 100, supply: 'Over-the-counter Rx order', refills: 'As directed', slot: 'lunch', schedule: 'Once daily with lunch', remaining: '100 tablets', due: 'Taken 12:30 PM' }
]);
await rx('RX-87904', 'Dr. Emily Watson, MD', 'Primary Care', 'West End Primary Care', '2024-09-28 14:15:00', 'active', 'Dec 2024', '6-month lipid therapy (re-evaluate Dec 2024)', [
	{ name: 'Atorvastatin Calcium', strength: '20 mg', form: 'Oral tablet', frequency: 'Bedtime', sig: 'Take 1 tablet daily at bedtime.', indication: 'Cholesterol control and LDL plaque stabilization.', quantity: 90, supply: '90-day supply', refills: '2 refills left', slot: 'bedtime', schedule: 'Daily at bedtime' }
]);
await rx('RX-86510', 'Dr. Marcus Vance, MD', 'Gastroenterology', 'Digestive Health Specialists', '2024-08-15 11:00:00', 'completed', null, '30-day completed course (ended Sep 14, 2024)', [
	{ name: 'Pantoprazole Sodium', strength: '40 mg', form: 'Delayed-release tablet', frequency: 'Once daily', sig: 'Took 1 tablet once daily 30 minutes before the first meal.', indication: 'Acid reflux management and protection against medication-related gastritis.', quantity: 30, supply: 'Course finished', refills: '0' }
]);
await rx('RX-82190', 'Dr. Emily Watson, MD', 'Primary Care', 'West End Primary Care', '2024-06-10 16:45:00', 'ceased', null, 'Discontinued when rhythm therapy changed', [
	{ name: 'Lisinopril', strength: '10 mg', form: 'Tablet', frequency: 'Once daily', sig: 'Previously 1 tablet daily.', indication: 'Blood pressure. Switched toward metoprolol.', quantity: 30, supply: 'Discontinued', refills: '0' }
]);

await sql`
	INSERT INTO dose_logs (patient_id, item_name, slot, label, status, log_date) VALUES
	(${ids['PID-4089']}, 'Morning medicines', 'morning', 'Morning 8:00 AM • Done', 'taken', DATE '2024-11-17'),
	(${ids['PID-4089']}, 'Aspirin (Enteric Coated)', 'lunch', 'With lunch 12:30 PM • Done', 'taken', DATE '2024-11-17'),
	(${ids['PID-4089']}, 'Apixaban (Eliquis)', 'evening', 'Evening 8:00 PM • Due', 'due', DATE '2024-11-17')
`;

async function lab(name, category, on, facility, status, md, specimen, panel, note, results) {
	const [row] = await sql`
		INSERT INTO labs (patient_id, name, category, collected_on, facility, status, ordering_md, specimen, panel_id, note, acknowledged)
		VALUES (${ids['PID-4089']}, ${name}, ${category}, ${on}, ${facility}, ${status}, ${md}, ${specimen}, ${panel}, ${note}, false)
		RETURNING id
	`;
	for (const [index, result] of results.entries()) {
		await sql`
			INSERT INTO lab_results (lab_id, name, detail, value_num, value_text, unit, ref_low, ref_high, flag, sort_order)
			VALUES (
				${row.id}, ${result.name}, ${result.detail ?? null}, ${result.value ?? null}, ${result.text ?? null},
				${result.unit ?? null}, ${result.low ?? null}, ${result.high ?? null}, ${result.flag}, ${index}
			)
		`;
	}
}

await lab('Complete Blood Count (CBC with Differential)', 'Hematology', '2024-10-25', 'Quest Diagnostics', 'completed', 'Dr. Sarah Jensen, MD', 'Venous whole blood, EDTA lavender top', 'CBC-99201-AUTO', 'All hematologic indices within healthy physiological limits. No evidence of anemia, leukocytosis, or thrombotic cytopenia. Cellular indices demonstrate baseline cardiovascular stability post-procedure.', [
	{ name: 'White Blood Cells (WBC)', detail: 'Total leukocyte count', value: 6.8, unit: 'K/uL', low: 4, high: 11, flag: 'Normal' },
	{ name: 'Red Blood Cells (RBC)', detail: 'Erythrocyte concentration', value: 4.62, unit: 'M/uL', low: 4.2, high: 5.4, flag: 'Normal' },
	{ name: 'Hemoglobin (Hgb)', detail: 'Oxygen transport', value: 13.9, unit: 'g/dL', low: 12, high: 16, flag: 'Normal' },
	{ name: 'Hematocrit (Hct)', detail: 'Packed cell volume', value: 41.5, unit: '%', low: 37, high: 47, flag: 'Normal' },
	{ name: 'Platelets', detail: 'Thrombocytes', value: 242, unit: 'K/uL', low: 150, high: 450, flag: 'Normal' },
	{ name: 'MCV', detail: 'Mean cell volume', value: 89.8, unit: 'fL', low: 80, high: 100, flag: 'Normal' },
	{ name: 'Neutrophils', detail: 'Differential %', value: 58.2, unit: '%', low: 40, high: 70, flag: 'Normal' },
	{ name: 'Lymphocytes', detail: 'Immune defense', value: 31.4, unit: '%', low: 20, high: 40, flag: 'Normal' }
]);
await lab('Comprehensive Lipid Profile (Fasting)', 'Cardiovascular', '2024-09-29', 'Labcorp Regional', 'completed', 'Dr. Emily Watson, MD', 'Fasting serum', 'LIP-4410', 'LDL remains borderline. Mediterranean heart-healthy diet recommended.', [
	{ name: 'Total Cholesterol', value: 198, unit: 'mg/dL', low: 0, high: 200, flag: 'Normal' },
	{ name: 'LDL-C', value: 114, unit: 'mg/dL', low: 0, high: 100, flag: 'Borderline' },
	{ name: 'HDL-C', value: 56, unit: 'mg/dL', low: 50, high: 90, flag: 'Optimal' },
	{ name: 'Triglycerides', value: 140, unit: 'mg/dL', low: 0, high: 150, flag: 'Normal' }
]);
await lab('Comprehensive Metabolic Panel (CMP-14 + hs-CRP)', 'Metabolic & Renal', '2024-08-16', 'Metropolitan Outpatient Lab', 'completed', 'Dr. Emily Watson, MD', 'Serum', 'CMP-14', 'Renal function and fasting glucose are optimal.', [
	{ name: 'eGFR', text: '>90', unit: 'mL/min', flag: 'Optimal' },
	{ name: 'Glucose', detail: 'Fasting', value: 94, unit: 'mg/dL', low: 70, high: 99, flag: 'Optimal' },
	{ name: 'hs-CRP', value: 1.2, unit: 'mg/L', low: 0, high: 3, flag: 'Normal' }
]);
await lab('High-Sensitivity Cardiac Troponin T', 'Cardiac Biomarker', '2024-06-11', 'West End Rapid Lab', 'completed', 'Dr. Sarah Jensen, MD', 'Plasma', 'TNT-HS', 'Negative for myocardial injury.', [
	{ name: 'Troponin T', text: '<6', unit: 'ng/L', flag: 'Negative / Normal' }
]);

const vessels = [
	{ name: 'Left Main (LMCA)', status: 'Normal / Patent', note: 'Supplies about 70% of the left ventricle. Clear and open.' },
	{ name: 'LAD (Left Anterior Descending)', status: '15–20% Stenosis', note: 'Mild focal calcified plaque in the proximal segment. Preserved distal contrast flow.' },
	{ name: 'LCx (Circumflex)', status: 'Patent / No Plaque', note: 'Supplies the lateral heart wall. Clear and open.' },
	{ name: 'RCA (Right Coronary)', status: 'Patent / Dominant', note: 'Supplies the sinus node and right ventricle. Clear and open.' }
];

await sql`
	INSERT INTO imaging_studies (
		patient_id, modality, title, performed_on, facility, equipment, radiologist, protocol, summary,
		impression, meta, calcium_score, patient_quote, outlook, vessels, status
	) VALUES (
		${ids['PID-4089']}, 'Cardiac CT', 'Cardiac CT Angiography (CCTA with Contrast)', DATE '2024-10-26',
		'St. Jude Cardiovascular Imaging Center', 'Somatom Force 2×192', 'Dr. Arthur Pendelton, MD',
		'Retrospective ECG-gated CCTA',
		'Mild non-obstructive calcified plaque in the proximal LAD (Agatston score: 42).',
		'1. Mild non-obstructive coronary artery disease (CAD-RADS 1): limited to the proximal LAD with mild calcification and minimal luminal compromise. 2. Stable myocardial morphology: normal LV chamber dimensions and preserved wall thickness. No gross ischemia or pericardial abnormalities.',
		'320 slices • 3D recon', 42,
		'Eleanor, your CT scan shows that your major coronary arteries are open and healthy. There is a very mild area of plaque (15–20%) in one small section, which is typical for your age and completely stable. Your medication regimen provides great protection.',
		'Scores under 100 reflect a low cardiovascular event probability over the next decade.',
		${sql.json(vessels)}, 'final'
	)
`;
await sql`
	INSERT INTO imaging_studies (
		patient_id, modality, title, performed_on, facility, radiologist, summary, impression, meta, vessels, status
	) VALUES (
		${ids['PID-4089']}, 'Echo / Ultrasound', 'Transthoracic Echocardiogram (TTE - 2D/Doppler)', DATE '2024-09-14',
		'West End Diagnostic Imaging', 'Dr. Ronald Hayes, MD',
		'Normal LV systolic function, LVEF 62%, trace mitral regurgitation.',
		'Preserved ejection fraction, normal wall motion, trace physiological mitral regurgitation.',
		'24 cine loops • color flow', ${sql.json([])}::jsonb, 'final'
	)
`;
await sql`
	INSERT INTO imaging_studies (
		patient_id, modality, title, performed_on, facility, summary, impression, meta, vessels, status
	) VALUES (
		${ids['PID-4089']}, 'X-Ray', '2-View PA & Lateral Chest Radiograph', DATE '2024-06-12',
		'Metropolitan Health Radiology',
		'Clear lung fields, normal cardiothoracic ratio, no active cardiopulmonary disease.',
		'No acute cardiopulmonary process.',
		'2 high-resolution views (PA / lateral)', ${sql.json([])}::jsonb, 'final'
	)
`;

await sql`
	INSERT INTO care_orders (patient_id, kind, title, ordered_by, status, schedule_label, facility, instructions) VALUES
	(
		${ids['PID-4089']}, 'diagnostic', '12-Lead Ambulatory ECG / Holter Monitor', 'Dr. Sarah Jensen, MD',
		'Pending clinic visit', 'Scheduled: Nov 21, 2024 (during upcoming visit)', 'St. Jude Heart Pavilion',
		'Wear comfortable loose two-piece clothing; avoid oily lotions or powders on the chest prior to placement.'
	),
	(
		${ids['PID-4089']}, 'lab', 'Fasting Lipid Panel & hs-CRP Blood Draw', 'Dr. Emily Watson, MD (PCP)',
		'Lab requisition issued', 'Due by: Dec 05, 2024', 'Quest Diagnostics (walk-in or booked)',
		'12-hour overnight fasting required; plain water permitted and encouraged for vein hydration.'
	)
`;

const [openInvoice] = await sql`
	INSERT INTO invoices (patient_id, code, title, issued_on, due_on, status, insurance_note, patient_due)
	VALUES (
		${ids['PID-4089']}, 'INV-2024-1184', 'Cardiology Follow-up', DATE '2024-11-14', DATE '2024-12-14',
		'pending', 'Insurance covered (80% BlueCross PPO)', 20
	)
	RETURNING id
`;
await sql`
	INSERT INTO invoice_lines (invoice_id, description, amount) VALUES
	(${openInvoice.id}, 'Doctor consultation fee', 80),
	(${openInvoice.id}, 'In-clinic diagnostic / pre-analysis', 20),
	(${openInvoice.id}, 'Insurance covered (80% BlueCross PPO)', -80)
`;
await sql`
	INSERT INTO invoices (patient_id, code, title, issued_on, status, insurance_note, patient_due, paid_via, paid_on) VALUES
	(${ids['PID-4089']}, 'INV-2024-0942', 'Cardiac CT Scan Copay', DATE '2024-10-26', 'paid', 'Paid via Apple Pay on Oct 27, 2024', 35, 'Apple Pay', DATE '2024-10-27'),
	(${ids['PID-4089']}, 'INV-2024-0810', 'Echocardiogram Facility Copay', DATE '2024-09-14', 'paid', 'Paid via Visa •••• 4210 on Sep 15, 2024', 45, 'Visa •••• 4210', DATE '2024-09-15'),
	(${ids['PID-4089']}, 'INV-2024-0701', 'Annual Lab Panel Copay', DATE '2024-06-10', 'paid', 'Direct account settlement', 15, 'Direct account', DATE '2024-06-12')
`;

const [consult] = await sql`
	INSERT INTO consultations (patient_id, doctor_id, code, status, modality, narrative, pharmacy, started_at)
	VALUES (
		${ids['PID-4089']}, ${doctor.id}, 'ENC-2024-884', 'in_session', 'in_person',
		'Patient presents with episodic post-exertional chest awareness and palpitations for 3 weeks. No syncopal events, orthopnea, or ankle edema. Resting hemodynamics remain stable. Recommended baseline cardiac assessment.',
		'CVS Pharmacy #4120 • 4th St & Broadway',
		TIMESTAMP '2024-11-17 14:15:00'
	)
	RETURNING id
`;
await sql`
	INSERT INTO consultation_entries (consultation_id, kind, label, detail) VALUES
	(${consult.id}, 'Vital Sign', 'Blood Pressure — 128/82 mmHg', 'Normal sitting resting'),
	(${consult.id}, 'Vital Sign', 'Heart Rate — 78 bpm', 'Regular rhythm'),
	(${consult.id}, 'Symptom', 'Episodic Palpitations', 'Grade 2, onset 3 weeks ago, post-exertion'),
	(${consult.id}, 'Observation', 'S1/S2 Normal', 'No murmurs detected')
`;
await sql`
	INSERT INTO consultation_orders (consultation_id, kind, title, detail, note) VALUES
	(${consult.id}, 'medication', 'Metoprolol Tartrate', '25 mg BID • 30-day supply (60 tabs)', 'Rate control'),
	(${consult.id}, 'medication', 'Rosuvastatin Calcium', '10 mg daily • 90-day supply (90 caps)', 'Lipid therapy'),
	(${consult.id}, 'referral', 'Dr. Marcus Vance, MD', 'Gastroenterology & Hepatology • West End Medical', 'Rule out GERD-induced atypical chest discomfort vs esophageal spasm.'),
	(${consult.id}, 'referral', 'Dr. Elena Rostova, MD, FACC', 'Cardiac Electrophysiology • St. Jude Heart Clinic', 'Routine second opinion'),
	(${consult.id}, 'test', '12-Lead Ambulatory ECG / Holter', 'High priority', 'Palpitation and nocturnal arrhythmia surveillance'),
	(${consult.id}, 'test', 'CMP + hs-CRP (Venous Blood)', 'Fasting required 12h • turnaround 4–6h', 'Fast overnight; avoid caffeine and stressors'),
	(${consult.id}, 'test', 'Transthoracic Echocardiogram (TTE)', 'Standard outpatient', 'LVEF and wall motion')
`;

const metrics = [
	[1, 'Monthly Encounters', '164', 'Pacing 108% of target', '+14%'],
	[2, 'Avg Consultation', '21 min', 'Benchmark ≤ 25 min', 'Optimal'],
	[3, 'Diagnostic Conversions', '48', 'Yield ratio 29.2% of intake', '+6 vs prev'],
	[4, 'Telemetry Fulfillment', '98.6%', 'Panels zero backlogged', '100% SLA']
];
for (const metric of metrics) {
	await sql`
		INSERT INTO practice_metrics (sort_order, label, value, caption, delta)
		VALUES (${metric[0]}, ${metric[1]}, ${metric[2]}, ${metric[3]}, ${metric[4]})
	`;
}
const modalities = [
	[1, 'Transthoracic Echo', 46, 32.4],
	[2, '24h Holter Monitoring', 38, 26.8],
	[3, 'Cardiac CT Angiography', 24, 16.9],
	[4, 'Stress Treadmill Test', 19, 13.4],
	[5, 'Advanced Lipid Panels', 15, 10.5]
];
for (const row of modalities) {
	await sql`INSERT INTO modality_volumes (sort_order, name, units, share) VALUES (${row[0]}, ${row[1]}, ${row[2]}, ${row[3]})`;
}
const cohorts = [
	[1, 'Hypertension', 62, 38],
	[2, 'CAD / Post-PCI', 48, 29],
	[3, 'Arrhythmia / AFib', 34, 21],
	[4, 'Preventive', 20, 12]
];
for (const row of cohorts) {
	await sql`INSERT INTO cohorts (sort_order, name, patients, share) VALUES (${row[0]}, ${row[1]}, ${row[2]}, ${row[3]})`;
}
const referrals = [
	[1, 'Direct • Concierge Intake', 'Executive Health Network', 45.3, 24],
	[2, 'Dr. K. Miller', 'Internal Medicine Specialists', 26.4, 14],
	[3, 'Dr. Aris Thorne', 'Thorne Interventional Endocrine', 17.0, 9],
	[4, 'Dr. Julian Vance', 'Sports Physiology & Geriatrics', 11.3, 6]
];
for (const row of referrals) {
	await sql`
		INSERT INTO referral_sources (sort_order, name, channel, share, patients)
		VALUES (${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]})
	`;
}
await sql`
	INSERT INTO practice_notes (body)
	VALUES ('Elevated post-PCI diagnostic conversions triggered 18 Holter telemetry dispatches this cycle.')
`;
await sql`
	INSERT INTO notifications (user_id, title, body, created_at) VALUES
	(${patientUser.id}, 'Evening dose due', 'Apixaban 5 mg is due at 8:00 PM.', TIMESTAMP '2024-11-17 12:00:00'),
	(${patientUser.id}, 'Holter visit', 'Your monitor is placed during the Nov 21 visit with Dr. Jensen.', TIMESTAMP '2024-11-16 09:00:00'),
	(${doctorUser.id}, 'Chart ready', 'Eleanor Vance is checked in for the 2:15 PM arrhythmia review.', TIMESTAMP '2024-11-17 13:50:00')
`;

await sql.end();
console.log('Seeded CareOS on the 17 Nov 2024 clinic day.');
