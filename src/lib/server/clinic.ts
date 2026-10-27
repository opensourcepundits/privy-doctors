import { CLINIC_DAY } from '#lib/format';
import { addDays, localStamp, openSlots, parseClock, type WindowRow } from '#lib/schedule';
import { client } from './db';

export type PatientRow = {
	id: number;
	user_id: number | null;
	primary_doctor_id: number | null;
	pid: string;
	first_name: string;
	last_name: string;
	dob: Date;
	sex: string;
	blood_type: string | null;
	allergies: string[];
	conditions: string[];
	surgeries: { year: string; name: string }[];
	phone: string | null;
	nic: string | null;
	passport: string | null;
	concierge_note: string | null;
	insurance_name: string | null;
	insurance_group: string | null;
	insurance_member: string | null;
	pharmacy_name: string | null;
	pharmacy_address: string | null;
	pharmacy_phone: string | null;
};

export async function doctorForUser(userId: number) {
	const [doctor] = await client`
		SELECT * FROM doctors WHERE user_id = ${userId}
	`;
	return doctor ?? null;
}

export async function updateDoctorProfile(
	doctorId: number,
	userId: number | null,
	input: { name: string; credentials: string; specialty: string; practice: string; location: string; phone: string }
) {
	const name = input.name.trim();
	const credentials = input.credentials.trim();
	const specialty = input.specialty.trim();
	const practice = input.practice.trim();
	const location = input.location.trim();
	const phone = input.phone.trim();
	if (name.length < 2 || name.length > 80) return { error: 'Enter the name as it should appear on the profile.' };
	if (credentials.length < 2 || credentials.length > 40) return { error: 'Enter the credentials, such as MD, FACC.' };
	if (specialty.length < 2 || specialty.length > 80) return { error: 'Enter the specialty.' };
	if (practice.length < 2 || practice.length > 160) return { error: 'Enter the practice name.' };
	if (location.length < 2 || location.length > 160) return { error: 'Enter the practice location.' };
	if (phone && (phone.length > 40 || !/^[+0-9()\-.\s]+$/.test(phone))) {
		return { error: 'Enter a phone number using digits, spaces, and + ( ) - .' };
	}
	await client.begin(async (sql) => {
		await sql`
			UPDATE doctors
			SET name = ${name}, credentials = ${credentials}, specialty = ${specialty},
				practice = ${practice}, location = ${location}, phone = ${phone || null}
			WHERE id = ${doctorId}
		`;
		if (userId) await sql`UPDATE users SET name = ${name} WHERE id = ${userId}`;
	});
	return { ok: true as const };
}

export async function accountEmail(userId: number | null) {
	if (!userId) return null;
	const [user] = await client<{ email: string }[]>`SELECT email FROM users WHERE id = ${userId}`;
	return user?.email ?? null;
}

const patientFields = new Set([
	'first_name',
	'last_name',
	'dob',
	'sex',
	'blood_type',
	'nic',
	'passport',
	'phone',
	'email',
	'conditions',
	'allergies',
	'surgeries',
	'insurance_name',
	'insurance_group',
	'insurance_member'
]);

function listLines(value: string, limit: number) {
	const items = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	if (items.length > limit) return { error: `Keep this list to ${limit} lines.` };
	if (items.some((item) => item.length > 120)) return { error: 'Keep each line under 120 characters.' };
	return { items };
}

export async function updatePatientField(patientId: number, field: string, raw: string) {
	if (!patientFields.has(field)) return { error: 'Choose a detail to update.' };
	const [patient] = await client<PatientRow[]>`SELECT * FROM patients WHERE id = ${patientId}`;
	if (!patient) return { error: 'That chart could not be found.' };
	const value = raw.trim();
	const identity = /^[A-Za-z0-9][A-Za-z0-9\s-]{4,31}$/;

	try {
		if (field === 'first_name' || field === 'last_name') {
			if (value.length < 2 || value.length > 40) return { error: 'Enter a name using 2 to 40 characters.' };
			const first = field === 'first_name' ? value : patient.first_name;
			const last = field === 'last_name' ? value : patient.last_name;
			if (first === patient.first_name && last === patient.last_name) return { error: 'That is already on file.' };
			await client.begin(async (sql) => {
				if (field === 'first_name') await sql`UPDATE patients SET first_name = ${value} WHERE id = ${patientId}`;
				else await sql`UPDATE patients SET last_name = ${value} WHERE id = ${patientId}`;
				if (patient.user_id) await sql`UPDATE users SET name = ${`${first} ${last}`} WHERE id = ${patient.user_id}`;
			});
			return { ok: true as const };
		}

		if (field === 'dob') {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return { error: 'Enter a valid date of birth.' };
			if (value < '1900-01-01' || value > CLINIC_DAY) return { error: 'Enter a date of birth on or before the clinic day.' };
			const current = String(patient.dob).slice(0, 10);
			if (value === current) return { error: 'That is already on file.' };
			await client`UPDATE patients SET dob = ${value} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'sex') {
			if (value !== 'Female' && value !== 'Male') return { error: 'Choose Female or Male.' };
			if (value === patient.sex) return { error: 'That is already on file.' };
			await client`UPDATE patients SET sex = ${value} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'blood_type') {
			if (value && !/^(A|B|AB|O)[+-]$/.test(value)) return { error: 'Enter a blood type such as A+ or O-.' };
			if ((value || null) === (patient.blood_type ?? null)) return { error: 'That is already on file.' };
			await client`UPDATE patients SET blood_type = ${value || null} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'nic' || field === 'passport') {
			if (value && !identity.test(value)) return { error: 'Use 5 to 32 letters and numbers.' };
			const nextNic = field === 'nic' ? value : (patient.nic ?? '');
			const nextPassport = field === 'passport' ? value : (patient.passport ?? '');
			if (!nextNic && !nextPassport) return { error: 'Keep a NIC or a passport number on the chart.' };
			if ((value || null) === ((field === 'nic' ? patient.nic : patient.passport) ?? null)) {
				return { error: 'That is already on file.' };
			}
			if (field === 'nic') await client`UPDATE patients SET nic = ${value || null} WHERE id = ${patientId}`;
			else await client`UPDATE patients SET passport = ${value || null} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'phone') {
			if (value && (value.length > 40 || !/^[+0-9()\-.\s]+$/.test(value))) {
				return { error: 'Enter a phone number using digits, spaces, and + ( ) - .' };
			}
			if ((value || null) === (patient.phone ?? null)) return { error: 'That is already on file.' };
			await client`UPDATE patients SET phone = ${value || null} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'email') {
			if (!patient.user_id) return { error: 'This chart has no sign-in email to change.' };
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 120) return { error: 'Enter a valid email address.' };
			const current = await accountEmail(patient.user_id);
			if (value.toLowerCase() === current?.toLowerCase()) return { error: 'That is already on file.' };
			const [taken] = await client<{ id: number }[]>`SELECT id FROM users WHERE lower(email) = lower(${value}) AND id <> ${patient.user_id}`;
			if (taken) return { error: 'Another account already uses that email.' };
			await client`UPDATE users SET email = ${value} WHERE id = ${patient.user_id}`;
			return { ok: true as const };
		}

		if (field === 'conditions' || field === 'allergies') {
			const parsed = listLines(value, 12);
			if ('error' in parsed) return parsed;
			const current = field === 'conditions' ? patient.conditions : patient.allergies;
			if (parsed.items.join('\n') === current.join('\n')) return { error: 'That is already on file.' };
			if (field === 'conditions') await client`UPDATE patients SET conditions = ${client.json(parsed.items)} WHERE id = ${patientId}`;
			else await client`UPDATE patients SET allergies = ${client.json(parsed.items)} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'surgeries') {
			const parsed = listLines(value, 12);
			if ('error' in parsed) return parsed;
			const surgeries: { year: string; name: string }[] = [];
			for (const line of parsed.items) {
				const yearFirst = /^(\d{4})\s*[—–-]\s*(.+)$/.exec(line);
				const nameFirst = /^(.+?)\s*[—–-]\s*(\d{4})$/.exec(line);
				const year = yearFirst?.[1] ?? nameFirst?.[2];
				const name = (yearFirst?.[2] ?? nameFirst?.[1] ?? '').trim();
				if (!year || !name || name.length > 80) return { error: 'Write each procedure as 1998 — Appendectomy.' };
				surgeries.push({ year, name });
			}
			const current = patient.surgeries.map((item) => `${item.year} — ${item.name}`).join('\n');
			const next = surgeries.map((item) => `${item.year} — ${item.name}`).join('\n');
			if (next === current) return { error: 'That is already on file.' };
			await client`UPDATE patients SET surgeries = ${client.json(surgeries)} WHERE id = ${patientId}`;
			return { ok: true as const };
		}

		if (field === 'insurance_name' || field === 'insurance_group' || field === 'insurance_member') {
			if (value.length > 120) return { error: 'Keep this under 120 characters.' };
			const current =
				field === 'insurance_name' ? patient.insurance_name : field === 'insurance_group' ? patient.insurance_group : patient.insurance_member;
			if ((value || null) === (current ?? null)) return { error: 'That is already on file.' };
			if (field === 'insurance_name') await client`UPDATE patients SET insurance_name = ${value || null} WHERE id = ${patientId}`;
			else if (field === 'insurance_group') await client`UPDATE patients SET insurance_group = ${value || null} WHERE id = ${patientId}`;
			else await client`UPDATE patients SET insurance_member = ${value || null} WHERE id = ${patientId}`;
			return { ok: true as const };
		}
	} catch (error) {
		const constraint = error && typeof error === 'object' && 'constraint_name' in error ? String(error.constraint_name) : '';
		if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
			return { error: constraint.includes('passport') ? 'A chart already uses that passport number.' : 'A chart already uses that NIC.' };
		}
		throw error;
	}

	return { error: 'Choose a detail to update.' };
}

export async function patientForUser(userId: number) {
	const [patient] = await client<PatientRow[]>`SELECT * FROM patients WHERE user_id = ${userId}`;
	return patient ?? null;
}

export async function patientByPid(pid: string) {
	const [patient] = await client<PatientRow[]>`SELECT * FROM patients WHERE pid = ${pid}`;
	return patient ?? null;
}

export async function portalPatient() {
	const [patient] = await client<PatientRow[]>`
		SELECT * FROM patients WHERE pid = 'PID-4089'
	`;
	return patient;
}

export async function actingPatient(user: { id: number; role: 'doctor' | 'patient' }) {
	if (user.role === 'doctor') return portalPatient();
	return patientForUser(user.id);
}

export async function todayAppointments(doctorId: number) {
	return client`
		SELECT a.*, p.first_name, p.last_name, p.pid, p.dob, p.sex
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		WHERE a.doctor_id = ${doctorId}
		  AND a.starts_at::date = DATE '2024-11-17'
		ORDER BY a.starts_at
	`;
}

export async function upcomingAppointment(patientId: number) {
	const [row] = await client`
		SELECT a.*, d.name AS doctor_name, d.credentials, d.specialty
		FROM appointments a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.patient_id = ${patientId}
		  AND a.starts_at::date > ${CLINIC_DAY}
		ORDER BY a.starts_at
		LIMIT 1
	`;
	return row ?? null;
}

export async function futureAppointments(patientId: number) {
	return client`
		SELECT a.*, d.name AS doctor_name, d.credentials, d.specialty
		FROM appointments a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.patient_id = ${patientId}
		  AND a.starts_at::date > ${CLINIC_DAY}
		ORDER BY a.starts_at
	`;
}

export async function upcomingForDoctor(doctorId: number) {
	return client`
		SELECT a.*, p.first_name, p.last_name, p.pid
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		WHERE a.doctor_id = ${doctorId}
		  AND a.starts_at::date > ${CLINIC_DAY}
		ORDER BY a.starts_at
	`;
}

type AvailabilityRow = WindowRow & { id: number; doctor_id: number };

export async function doctorSchedule(doctorId: number) {
	return client<AvailabilityRow[]>`
		SELECT * FROM availability
		WHERE doctor_id = ${doctorId}
		ORDER BY kind, weekday, start_time
	`;
}

export async function setDayAvailability(
	doctorId: number,
	input: { kind: string; weekday: number; ranges: { start: string; end: string }[] }
) {
	if (input.kind !== 'clinic' && input.kind !== 'home') {
		return { error: 'Choose clinic hours or at-home hours.' };
	}
	if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
		return { error: 'Choose a day.' };
	}
	const filled = input.ranges.filter((range) => range.start.trim() || range.end.trim());
	if (!filled.length) return { error: 'Add at least one time range.' };
	if (filled.length > 3) return { error: 'A day can have at most three time ranges.' };
	const parsed: { start: string; end: string }[] = [];
	for (const range of filled) {
		const start = parseClock(range.start);
		const end = parseClock(range.end);
		if (!start || !end) return { error: 'Enter a start and end for each range.' };
		if (start >= end) return { error: 'Each range needs an end time later than its start.' };
		parsed.push({ start, end });
	}
	parsed.sort((left, right) => left.start.localeCompare(right.start));
	for (let index = 1; index < parsed.length; index += 1) {
		if (parsed[index].start < parsed[index - 1].end) {
			return { error: 'Ranges on the same day cannot overlap.' };
		}
	}
	await client.begin(async (sql) => {
		await sql`
			DELETE FROM availability
			WHERE doctor_id = ${doctorId} AND kind = ${input.kind} AND weekday = ${input.weekday}
		`;
		for (const range of parsed) {
			await sql`
				INSERT INTO availability (doctor_id, kind, weekday, start_time, end_time)
				VALUES (${doctorId}, ${input.kind}, ${input.weekday}, ${range.start}, ${range.end})
			`;
		}
	});
	return { ok: true as const };
}

export async function removeAvailability(doctorId: number, id: number) {
	await client`DELETE FROM availability WHERE id = ${id} AND doctor_id = ${doctorId}`;
}

export async function bookingBoard() {
	const doctors = await client<
		{
			id: number;
			name: string;
			credentials: string;
			specialty: string;
			gender: string;
			practice: string;
			location: string;
			phone: string | null;
		}[]
	>`
		SELECT id, name, credentials, specialty, gender, practice, location, phone
		FROM doctors
		ORDER BY name
	`;
	const hours = await client<AvailabilityRow[]>`
		SELECT * FROM availability ORDER BY doctor_id, weekday, start_time
	`;
	const horizon = addDays(CLINIC_DAY, 21);
	const taken = await client<{ doctor_id: number; starts_at: Date | string; duration_min: number }[]>`
		SELECT doctor_id, starts_at, duration_min
		FROM appointments
		WHERE starts_at::date > ${CLINIC_DAY}
		  AND starts_at::date <= ${horizon}
		  AND status <> 'cancelled'
	`;
	return doctors.map((doctor) => {
		const windows = hours.filter((row) => row.doctor_id === doctor.id);
		const blocks = taken
			.filter((row) => row.doctor_id === doctor.id)
			.map((row) => ({ start: localStamp(row.starts_at), duration: Number(row.duration_min) }));
		return { ...doctor, hours: windows, slots: openSlots(windows, blocks) };
	});
}

export async function bookAppointment(
	patientId: number,
	input: { doctorId: number; kind: string; startsAt: string; reason: string }
) {
	if (input.kind !== 'clinic' && input.kind !== 'home') {
		return { error: 'Choose a clinic visit or an at-home visit.' };
	}
	if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input.startsAt)) {
		return { error: 'Choose an open time.' };
	}
	const board = await bookingBoard();
	const doctor = board.find((row) => row.id === input.doctorId);
	if (!doctor) return { error: 'That clinician is not on the schedule.' };
	const slot = doctor.slots.find((item) => item.kind === input.kind && item.startsAt === input.startsAt);
	if (!slot) return { error: 'That time is no longer open. Choose another.' };
	const reason = input.reason.trim().slice(0, 240) || 'Requested from the patient portal';
	const title = input.kind === 'home' ? 'At-home visit' : 'Clinic consultation';
	const location = input.kind === 'home' ? "At the patient's home" : doctor.location;
	await client`
		INSERT INTO appointments (
			patient_id, doctor_id, starts_at, duration_min, title, reason, status, location, last_visit_label
		) VALUES (
			${patientId}, ${doctor.id}, ${input.startsAt}, 30, ${title}, ${reason}, 'scheduled',
			${location}, 'Booked from the patient portal'
		)
	`;
	return { ok: true as const };
}

export async function createWalkInPatient(
	doctorId: number,
	input: {
		firstName: string;
		lastName: string;
		dob: string;
		sex: string;
		phone: string;
		nic: string;
		passport: string;
	}
) {
	const [patient] = await client`
		INSERT INTO patients (
			primary_doctor_id, pid, first_name, last_name, dob, sex, phone, nic, passport, concierge_note
		)
		VALUES (
			${doctorId},
			(
				SELECT 'PID-' || (COALESCE(MAX(CAST(SUBSTRING(pid FROM 5) AS int)), 1000) + 1)
				FROM patients
				WHERE pid ~ '^PID-[0-9]+$'
			),
			${input.firstName},
			${input.lastName},
			${input.dob},
			${input.sex},
			${input.phone || null},
			${input.nic || null},
			${input.passport || null},
			'Added during a consultation. No portal account.'
		)
		RETURNING *
	`;
	return patient;
}

export async function searchPatients(query: string) {
	const q = `%${query.trim()}%`;
	return client<PatientRow[]>`
		SELECT * FROM patients
		WHERE ${query.trim()} = ''
		   OR first_name ILIKE ${q}
		   OR last_name ILIKE ${q}
		   OR pid ILIKE ${q}
		   OR nic ILIKE ${q}
		   OR passport ILIKE ${q}
		   OR (first_name || ' ' || last_name) ILIKE ${q}
		ORDER BY last_name, first_name
	`;
}

export async function encountersFor(patientId: number) {
	return client`
		SELECT * FROM encounters WHERE patient_id = ${patientId} ORDER BY occurred_on DESC
	`;
}

export async function prescriptionsFor(patientId: number) {
	const rows = await client`
		SELECT * FROM prescriptions WHERE patient_id = ${patientId} ORDER BY ordered_at DESC
	`;
	const items = await client`
		SELECT i.* FROM prescription_items i
		JOIN prescriptions p ON p.id = i.prescription_id
		WHERE p.patient_id = ${patientId}
		ORDER BY i.sort_order, i.id
	`;
	return rows.map((row) => ({
		...row,
		items: items.filter((item) => item.prescription_id === row.id)
	}));
}

export async function prescriptionById(patientId: number, id: number) {
	const all = await prescriptionsFor(patientId);
	return all.find((row) => row.id === id) ?? null;
}

export async function labsFor(patientId: number) {
	const rows = await client`SELECT * FROM labs WHERE patient_id = ${patientId} ORDER BY collected_on DESC NULLS LAST`;
	const results = await client`
		SELECT r.* FROM lab_results r
		JOIN labs l ON l.id = r.lab_id
		WHERE l.patient_id = ${patientId}
		ORDER BY r.sort_order, r.id
	`;
	return rows.map((row) => ({
		...row,
		results: results.filter((result) => result.lab_id === row.id)
	}));
}

export async function labById(patientId: number, id: number) {
	const all = await labsFor(patientId);
	return all.find((row) => row.id === id) ?? null;
}

export async function imagingFor(patientId: number) {
	return client`
		SELECT * FROM imaging_studies WHERE patient_id = ${patientId} ORDER BY performed_on DESC NULLS LAST
	`;
}

export async function imagingById(patientId: number, id: number) {
	const [row] = await client`
		SELECT * FROM imaging_studies WHERE patient_id = ${patientId} AND id = ${id}
	`;
	return row ?? null;
}

export async function vitalsFor(patientId: number) {
	return client`
		SELECT * FROM vitals WHERE patient_id = ${patientId} ORDER BY recorded_at
	`;
}

export async function latestVital(patientId: number) {
	const [row] = await client`
		SELECT * FROM vitals WHERE patient_id = ${patientId} ORDER BY recorded_at DESC LIMIT 1
	`;
	return row ?? null;
}

export async function careOrdersFor(patientId: number) {
	return client`SELECT * FROM care_orders WHERE patient_id = ${patientId} ORDER BY id`;
}

export async function doseLogsFor(patientId: number) {
	return client`
		SELECT * FROM dose_logs WHERE patient_id = ${patientId} AND log_date = DATE '2024-11-17' ORDER BY id
	`;
}

export async function invoicesFor(patientId: number) {
	const rows = await client`SELECT * FROM invoices WHERE patient_id = ${patientId} ORDER BY issued_on DESC`;
	const lines = await client`
		SELECT l.* FROM invoice_lines l
		JOIN invoices i ON i.id = l.invoice_id
		WHERE i.patient_id = ${patientId}
		ORDER BY l.id
	`;
	return rows.map((row) => ({
		...row,
		lines: lines.filter((line) => line.invoice_id === row.id)
	}));
}

export async function notificationsFor(userId: number) {
	return client`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC`;
}

export async function analytics() {
	const metrics = await client`SELECT * FROM practice_metrics ORDER BY sort_order`;
	const modalities = await client`SELECT * FROM modality_volumes ORDER BY sort_order`;
	const cohorts = await client`SELECT * FROM cohorts ORDER BY sort_order`;
	const referrals = await client`SELECT * FROM referral_sources ORDER BY sort_order`;
	const [note] = await client`SELECT body FROM practice_notes LIMIT 1`;
	const modalityTotal = modalities.reduce((sum, row) => sum + Number(row.units), 0);
	const referralTotal = referrals.reduce((sum, row) => sum + Number(row.patients), 0);
	const panel = cohorts.reduce((sum, row) => sum + Number(row.patients), 0);
	return { metrics, modalities, cohorts, referrals, note: note?.body ?? '', modalityTotal, referralTotal, panel };
}

export async function draftConsult(patientId: number, doctorId: number) {
	let [consult] = await client`
		SELECT * FROM consultations
		WHERE patient_id = ${patientId} AND status = 'in_session'
		ORDER BY id DESC LIMIT 1
	`;
	if (consult) {
		const [refreshed] = await client`
			UPDATE consultations
			SET started_at = NOW(), doctor_id = ${doctorId}
			WHERE id = ${consult.id}
			  AND started_at = TIMESTAMPTZ '2024-11-17 14:15:00+00'
			RETURNING *
		`;
		if (refreshed) consult = refreshed;
	}
	if (!consult) {
		[consult] = await client`
			INSERT INTO consultations (patient_id, doctor_id, code, status, modality, narrative, pharmacy, started_at)
			VALUES (
				${patientId}, ${doctorId}, ${'ENC-' + patientId}, 'in_session', 'in_person', '',
				'CVS Pharmacy #4120 • 4th St & Broadway', NOW()
			)
			RETURNING *
		`;
	}
	const entries = await client`
		SELECT * FROM consultation_entries WHERE consultation_id = ${consult.id} ORDER BY id
	`;
	const orders = await client`
		SELECT * FROM consultation_orders WHERE consultation_id = ${consult.id} ORDER BY id
	`;
	return { ...consult, entries, orders };
}

export async function addConsultEntry(consultId: number, kind: string, label: string, detail: string) {
	await client`
		INSERT INTO consultation_entries (consultation_id, kind, label, detail)
		VALUES (${consultId}, ${kind}, ${label}, ${detail})
	`;
}

export async function removeConsultEntry(id: number) {
	await client`DELETE FROM consultation_entries WHERE id = ${id}`;
}

export async function saveNarrative(consultId: number, narrative: string, modality: string) {
	await client`
		UPDATE consultations SET narrative = ${narrative}, modality = ${modality} WHERE id = ${consultId}
	`;
}

export async function updatePharmacy(consultId: number, pharmacy: string) {
	await client`UPDATE consultations SET pharmacy = ${pharmacy} WHERE id = ${consultId}`;
}

export async function doctorById(id: number | null) {
	if (!id) return null;
	const [doctor] = await client`
		SELECT name, credentials, specialty, phone, practice, location FROM doctors WHERE id = ${id}
	`;
	return doctor ?? null;
}

export async function addConsultOrder(consultId: number, kind: string, title: string, detail: string, note: string) {
	await client`
		INSERT INTO consultation_orders (consultation_id, kind, title, detail, note)
		VALUES (${consultId}, ${kind}, ${title}, ${detail}, ${note})
	`;
}

export async function removeConsultOrder(id: number) {
	await client`DELETE FROM consultation_orders WHERE id = ${id}`;
}

export async function finalizeConsult(consultId: number) {
	const [consult] = await client`SELECT * FROM consultations WHERE id = ${consultId}`;
	if (!consult || consult.status !== 'in_session') return;
	const orders = await client`SELECT * FROM consultation_orders WHERE consultation_id = ${consultId}`;
	const [doctor] = await client`SELECT * FROM doctors WHERE id = ${consult.doctor_id}`;
	await client`
		INSERT INTO encounters (patient_id, doctor_name, doctor_role, practice, occurred_on, kind, focus, findings, plan, location, status)
		VALUES (
			${consult.patient_id}, ${doctor.name}, ${doctor.specialty}, ${doctor.practice},
			DATE '2024-11-17', 'Cardiology Consult', 'Signed consultation',
			${consult.narrative}, 'Orders authorized and transmitted.', ${doctor.location}, 'finalized'
		)
	`;
	const meds = orders.filter((order) => order.kind === 'medication');
	if (meds.length) {
		const [rx] = await client`
			INSERT INTO prescriptions (patient_id, code, prescriber, specialty, facility, pharmacy, ordered_at, status, auth_through, course_label)
			VALUES (
				${consult.patient_id}, ${'RX-' + consult.id}, ${doctor.name}, ${doctor.specialty},
				${doctor.location}, ${consult.pharmacy}, TIMESTAMP '2024-11-17 14:39:00', 'active',
				'Oct 2025', 'Signed during consultation'
			)
			RETURNING id
		`;
		for (const [index, med] of meds.entries()) {
			await client`
				INSERT INTO prescription_items (
					prescription_id, name, strength, form, sig, indication, supply_label, refills, sort_order
				) VALUES (
					${rx.id}, ${med.title}, ${med.detail}, 'Oral', ${med.detail}, ${med.note}, ${med.detail}, '0', ${index}
				)
			`;
		}
	}
	for (const order of orders.filter((item) => item.kind === 'test')) {
		await client`
			INSERT INTO care_orders (patient_id, kind, title, ordered_by, status, schedule_label, instructions)
			VALUES (
				${consult.patient_id}, 'diagnostic', ${order.title}, ${doctor.name}, ${order.detail},
				'Ordered 17 Nov 2024', ${order.note}
			)
		`;
	}
	await client`UPDATE consultations SET status = 'signed' WHERE id = ${consultId}`;
}

export async function logVital(patientId: number, systolic: number, diastolic: number, heartRate: number, source: string) {
	await client`
		INSERT INTO vitals (patient_id, recorded_at, systolic, diastolic, heart_rate, source, note)
		VALUES (${patientId}, TIMESTAMP '2024-11-17 15:10:00', ${systolic}, ${diastolic}, ${heartRate}, ${source}, 'Logged from the patient portal')
	`;
}

export async function confirmAppointment(id: number, patientId: number) {
	await client`
		UPDATE appointments SET status = 'confirmed'
		WHERE id = ${id} AND patient_id = ${patientId}
	`;
}

export async function payInvoice(id: number, patientId: number, method: string) {
	await client`
		UPDATE invoices
		SET status = 'paid', paid_via = ${method}, paid_on = DATE '2024-11-17'
		WHERE id = ${id} AND patient_id = ${patientId} AND status <> 'paid'
	`;
}

export async function requestRefill(patientId: number, prescriptionId: number) {
	await client`
		INSERT INTO refill_requests (patient_id, prescription_id, status)
		VALUES (${patientId}, ${prescriptionId}, 'sent')
	`;
}

export async function addOtc(patientId: number, name: string, detail: string) {
	let [rx] = await client`
		SELECT id FROM prescriptions
		WHERE patient_id = ${patientId} AND code = 'OTC-SELF'
	`;
	if (!rx) {
		[rx] = await client`
			INSERT INTO prescriptions (patient_id, code, prescriber, specialty, facility, pharmacy, ordered_at, status, course_label)
			VALUES (
				${patientId}, 'OTC-SELF', 'Self-reported', 'Patient', 'Home', NULL,
				TIMESTAMP '2024-11-17 15:00:00', 'active', 'Patient-reported supplement'
			)
			RETURNING id
		`;
	}
	await client`
		INSERT INTO prescription_items (prescription_id, name, strength, form, sig, indication, schedule_detail, sort_order)
		VALUES (${rx.id}, ${name}, ${detail}, 'OTC', ${detail}, 'Patient-reported', ${detail}, 20)
	`;
}

export async function takeDose(id: number, patientId: number) {
	await client`
		UPDATE dose_logs SET status = 'taken' WHERE id = ${id} AND patient_id = ${patientId}
	`;
}

export async function acknowledgeLab(id: number, patientId: number) {
	await client`
		UPDATE labs SET acknowledged = true WHERE id = ${id} AND patient_id = ${patientId}
	`;
}

export async function orderLab(patientId: number, name: string, facility: string, orderingMd: string) {
	await client`
		INSERT INTO labs (patient_id, name, category, status, facility, ordering_md, acknowledged)
		VALUES (${patientId}, ${name}, 'Ordered', 'pending', ${facility}, ${orderingMd}, false)
	`;
}
