import { randomBytes } from 'node:crypto';
import { tagsFrom } from '#lib/doses';
import { CLINIC_DAY, formatDate, formatLongDate, formatTime, isoDate, liveDay } from '#lib/format';
import { addDays, localStamp, openSlots, parseClock, type WindowRow } from '#lib/schedule';
import { client } from './db';
import { resolveImagePaths } from './storage';

export type PatientRow = {
	id: number;
	user_id: number | null;
	primary_doctor_id: number | null;
	pid: string;
	record_token: string | null;
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
			if (value < '1900-01-01' || value > liveDay()) return { error: 'Enter a date of birth on or before today.' };
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
			if (field === 'conditions') await client`UPDATE patients SET conditions = ${JSON.stringify(parsed.items)}::jsonb WHERE id = ${patientId}`;
			else await client`UPDATE patients SET allergies = ${JSON.stringify(parsed.items)}::jsonb WHERE id = ${patientId}`;
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
			await client`UPDATE patients SET surgeries = ${JSON.stringify(surgeries)}::jsonb WHERE id = ${patientId}`;
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
		  AND a.starts_at::date = ${CLINIC_DAY}
		  AND a.status NOT IN ('cancelled', 'declined')
		ORDER BY a.starts_at
	`;
}

export async function patientAppointments(patientId: number) {
	const rows = await client`
		SELECT a.*, d.name AS doctor_name, d.credentials, d.specialty,
			(a.starts_at::date = ${CLINIC_DAY}::date) AS on_clinic_day
		FROM appointments a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.patient_id = ${patientId}
		  AND a.starts_at::date >= ${CLINIC_DAY}::date
		  AND a.status NOT IN ('cancelled', 'declined')
		ORDER BY a.starts_at
	`;
	const onClinicDay = (row: { on_clinic_day?: unknown }) => row.on_clinic_day === true || row.on_clinic_day === 't';
	return {
		today: rows.filter((row) => onClinicDay(row)),
		upcoming: rows.filter((row) => !onClinicDay(row))
	};
}

export async function upcomingForDoctor(doctorId: number) {
	return client`
		SELECT a.*, p.first_name, p.last_name, p.pid
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		WHERE a.doctor_id = ${doctorId}
		  AND a.starts_at::date > ${CLINIC_DAY}
		  AND a.status NOT IN ('cancelled', 'declined')
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
		FROM doctors d
		WHERE EXISTS (SELECT 1 FROM availability a WHERE a.doctor_id = d.id)
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
		  AND status NOT IN ('cancelled', 'declined')
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
			${patientId}, ${doctor.id}, ${input.startsAt}, 30, ${title}, ${reason}, 'requested',
			${location}, 'Booked from the patient portal'
		)
	`;
	await grantAccess(patientId, doctor.id, 'appointment');
	return { ok: true as const };
}

export async function rescheduleSlots(doctorId: number) {
	const hours = await doctorSchedule(doctorId);
	const horizon = addDays(CLINIC_DAY, 21);
	const taken = await client<{ starts_at: Date | string; duration_min: number }[]>`
		SELECT starts_at, duration_min
		FROM appointments
		WHERE doctor_id = ${doctorId}
		  AND starts_at::date > ${CLINIC_DAY}
		  AND starts_at::date <= ${horizon}
		  AND status NOT IN ('cancelled', 'declined')
	`;
	const blocks = taken.map((row) => ({ start: localStamp(row.starts_at), duration: Number(row.duration_min) }));
	return openSlots(hours, blocks);
}

export async function respondToAppointment(
	doctorId: number,
	id: number,
	action: 'accept' | 'decline' | 'reschedule',
	input: { note?: string; startsAt?: string }
) {
	const [row] = await client<
		{
			id: number;
			starts_at: Date | string;
			location: string | null;
			status: string;
			user_id: number | null;
			doctor_name: string;
		}[]
	>`
		SELECT a.id, a.starts_at, a.location, a.status, p.user_id, d.name AS doctor_name
		FROM appointments a
		JOIN patients p ON p.id = a.patient_id
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.id = ${id} AND a.doctor_id = ${doctorId}
	`;
	if (!row) return { error: 'That booking is not on your schedule.' };
	if (row.status === 'declined' || row.status === 'cancelled') return { error: 'This booking is already closed.' };
	const when = `${formatLongDate(row.starts_at)} at ${formatTime(row.starts_at)}`;
	if (action === 'accept') {
		await client`
			UPDATE appointments SET status = 'accepted', responded_at = ${nowLocal().stamp}
			WHERE id = ${id}
		`;
		await notify(row.user_id, 'Appointment approved', `${row.doctor_name} approved your visit on ${when}.`);
		return { ok: true as const };
	}
	if (action === 'decline') {
		const note = (input.note ?? '').trim().slice(0, 240);
		await client`
			UPDATE appointments
			SET status = 'declined', response_note = ${note || null}, responded_at = ${nowLocal().stamp}
			WHERE id = ${id}
		`;
		await notify(
			row.user_id,
			'Appointment declined',
			`${row.doctor_name} declined your visit on ${when}.${note ? ` ${note}` : ''}`
		);
		return { ok: true as const };
	}
	const startsAt = input.startsAt ?? '';
	if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(startsAt)) return { error: 'Choose a new time.' };
	if (localStamp(row.starts_at).slice(0, 19) === startsAt) return { error: 'Choose a different time.' };
	const kind = String(row.location ?? '').startsWith('At the patient') ? 'home' : 'clinic';
	const slots = await rescheduleSlots(doctorId);
	if (!slots.some((slot) => slot.kind === kind && slot.startsAt === startsAt)) {
		return { error: 'That time is not open.' };
	}
	await client`
		UPDATE appointments
		SET starts_at = ${startsAt}, status = 'rescheduled', responded_at = ${nowLocal().stamp}
		WHERE id = ${id}
	`;
	const next = `${formatLongDate(startsAt)} at ${formatTime(startsAt)}`;
	await notify(row.user_id, 'Appointment rescheduled', `${row.doctor_name} moved your visit from ${when} to ${next}.`);
	return { ok: true as const };
}

export async function rescheduleOwnAppointment(patientId: number, id: number, startsAt: string) {
	const [row] = await client<
		{
			id: number;
			starts_at: Date | string;
			location: string | null;
			status: string;
			doctor_id: number;
			doctor_user_id: number | null;
			first_name: string;
			last_name: string;
		}[]
	>`
		SELECT a.id, a.starts_at, a.location, a.status, a.doctor_id, d.user_id AS doctor_user_id,
			p.first_name, p.last_name
		FROM appointments a
		JOIN doctors d ON d.id = a.doctor_id
		JOIN patients p ON p.id = a.patient_id
		WHERE a.id = ${id} AND a.patient_id = ${patientId}
	`;
	if (!row) return { error: 'That visit is not on your list.' };
	if (row.status !== 'accepted' && row.status !== 'confirmed' && row.status !== 'rescheduled') {
		return { error: 'Only an approved or rescheduled visit can be moved from tasks.' };
	}
	if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(startsAt)) return { error: 'Choose a new time.' };
	if (localStamp(row.starts_at).slice(0, 19) === startsAt) return { error: 'Choose a different time.' };
	const kind = String(row.location ?? '').startsWith('At the patient') ? 'home' : 'clinic';
	const slots = await rescheduleSlots(row.doctor_id);
	if (!slots.some((slot) => slot.kind === kind && slot.startsAt === startsAt)) {
		return { error: 'That time is not open.' };
	}
	await client`
		UPDATE appointments
		SET starts_at = ${startsAt}, status = 'rescheduled', responded_at = ${nowLocal().stamp}
		WHERE id = ${id}
	`;
	const when = `${formatLongDate(row.starts_at)} at ${formatTime(row.starts_at)}`;
	const next = `${formatLongDate(startsAt)} at ${formatTime(startsAt)}`;
	const approved = row.status === 'accepted' || row.status === 'confirmed';
	await notify(
		row.doctor_user_id,
		'Appointment rescheduled',
		`${row.first_name} ${row.last_name} moved ${approved ? 'an approved visit' : 'a visit'} from ${when} to ${next}.`
	);
	return { ok: true as const };
}

export async function taskVisits(patientId: number) {
	const rows = await client<
		{
			id: number;
			starts_at: Date | string;
			duration_min: number;
			title: string;
			reason: string | null;
			status: string;
			location: string | null;
			response_note: string | null;
			doctor_id: number;
			doctor_name: string;
			credentials: string | null;
		}[]
	>`
		SELECT a.id, a.starts_at, a.duration_min, a.title, a.reason, a.status, a.location, a.response_note,
			a.doctor_id, d.name AS doctor_name, d.credentials
		FROM appointments a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.patient_id = ${patientId}
		  AND a.starts_at::date >= ${CLINIC_DAY}::date
		  AND a.status NOT IN ('cancelled', 'declined')
		ORDER BY a.starts_at
	`;
	const movable = new Set(['accepted', 'confirmed', 'rescheduled']);
	const doctorIds = [...new Set(rows.filter((row) => movable.has(row.status)).map((row) => row.doctor_id))];
	const slots = new Map<number, Awaited<ReturnType<typeof rescheduleSlots>>>();
	await Promise.all(doctorIds.map(async (doctorId) => slots.set(doctorId, await rescheduleSlots(doctorId))));
	return rows.map((row) => ({
		...row,
		slots: movable.has(row.status) ? (slots.get(row.doctor_id) ?? []) : []
	}));
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
	const recordToken = randomBytes(24).toString('hex');
	const [patient] = await client`
		INSERT INTO patients (
			primary_doctor_id, pid, record_token, first_name, last_name, dob, sex, phone, nic, passport, concierge_note
		)
		VALUES (
			${doctorId},
			(
				SELECT 'PID-' || (COALESCE(MAX(CAST(SUBSTRING(pid FROM 5) AS int)), 1000) + 1)
				FROM patients
				WHERE pid ~ '^PID-[0-9]+$'
			),
			${recordToken},
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
	await grantAccess(patient.id, doctorId, 'registered');
	return patient;
}

export async function searchPatients(doctorId: number, query: string) {
	const q = `%${query.trim()}%`;
	return client<(PatientRow & { access: string })[]>`
		SELECT p.*, COALESCE(a.status, 'none') AS access
		FROM patients p
		LEFT JOIN patient_access a ON a.patient_id = p.id AND a.doctor_id = ${doctorId}
		WHERE ${query.trim()} = ''
		   OR p.first_name ILIKE ${q}
		   OR p.last_name ILIKE ${q}
		   OR p.pid ILIKE ${q}
		   OR p.nic ILIKE ${q}
		   OR p.passport ILIKE ${q}
		   OR (p.first_name || ' ' || p.last_name) ILIKE ${q}
		ORDER BY p.last_name, p.first_name
	`;
}

export async function patientsForDoctor(doctorId: number, query: string) {
	const q = `%${query.trim()}%`;
	return client<PatientRow[]>`
		SELECT p.*
		FROM patients p
		JOIN patient_access a ON a.patient_id = p.id AND a.doctor_id = ${doctorId} AND a.status = 'granted'
		WHERE ${query.trim()} = ''
		   OR p.first_name ILIKE ${q}
		   OR p.last_name ILIKE ${q}
		   OR p.pid ILIKE ${q}
		   OR p.nic ILIKE ${q}
		   OR p.passport ILIKE ${q}
		   OR (p.first_name || ' ' || p.last_name) ILIKE ${q}
		ORDER BY p.last_name, p.first_name
	`;
}

export async function encountersFor(patientId: number) {
	return client`
		SELECT * FROM encounters WHERE patient_id = ${patientId} ORDER BY occurred_on DESC
	`;
}

export async function consultationsFor(patientId: number) {
	return client`
		SELECT c.id, c.status, c.modality, c.narrative, c.code, c.started_at, c.doctor_id,
			d.name AS doctor_name, d.credentials, d.specialty
		FROM consultations c
		JOIN doctors d ON d.id = c.doctor_id
		WHERE c.patient_id = ${patientId}
		ORDER BY c.started_at DESC
	`;
}

type VisitEntry = { id: number; kind: string; label: string; detail: string | null };
type VisitOrder = {
	id: number;
	kind: string;
	title: string;
	detail: string | null;
	note: string | null;
	completes_on: Date | string | null;
};
type VisitTask = { id: number; title: string; detail: string | null; note: string | null; status: string };
type VisitReferral = {
	id: number;
	note: string | null;
	status: string;
	created_at: Date | string;
	from_name: string;
	from_credentials: string;
	from_specialty: string;
	to_name: string;
	to_credentials: string;
	to_specialty: string;
};

export type VisitRecord = {
	when: Date | string;
	status: string;
	code: string;
	modality: string;
	doctor: string;
	role: string;
	practice: string;
	location: string;
	kind: string;
	focus: string;
	findings: string;
	plan: string;
	narrative: string;
	continueHref: string;
	entries: VisitEntry[];
	orders: VisitOrder[];
	tasks: VisitTask[];
	prescriptions: Awaited<ReturnType<typeof prescriptionsFor>>;
	referrals: VisitReferral[];
};

async function prescriptionsOnVisit(patientId: number, day: string, doctorName: string, consultId: number | null) {
	const code = consultId ? `RX-${consultId}` : '';
	const rows = await client`
		SELECT * FROM prescriptions
		WHERE patient_id = ${patientId}
		  AND (
			(${consultId}::int IS NOT NULL AND code = ${code})
			OR (
				ordered_at::date = ${day}::date
				AND (${doctorName} ILIKE prescriber || '%' OR prescriber ILIKE ${doctorName} || '%')
			)
		  )
		ORDER BY ordered_at DESC
	`;
	if (!rows.length) return [];
	const ids = rows.map((row) => row.id);
	const items = await client`
		SELECT * FROM prescription_items
		WHERE prescription_id = ANY(${ids})
		ORDER BY sort_order, id
	`;
	return rows.map((row) => ({
		...row,
		items: items.filter((item) => item.prescription_id === row.id)
	}));
}

async function referralsOnVisit(patientId: number, day: string, doctorName: string, consultId: number | null) {
	return client<VisitReferral[]>`
		SELECT r.id, r.note, r.status, r.created_at,
			f.name AS from_name, f.credentials AS from_credentials, f.specialty AS from_specialty,
			t.name AS to_name, t.credentials AS to_credentials, t.specialty AS to_specialty
		FROM referrals r
		JOIN doctors f ON f.id = r.from_doctor_id
		JOIN doctors t ON t.id = r.to_doctor_id
		WHERE r.patient_id = ${patientId}
		  AND (
			(${consultId}::int IS NOT NULL AND (r.source_consult_id = ${consultId} OR r.follow_consult_id = ${consultId}))
			OR (
				r.created_at::date >= ${day}::date
				AND r.created_at::date <= (${day}::date + 21)
				AND (${doctorName} ILIKE f.name || '%' OR f.name ILIKE ${doctorName} || '%')
			)
		  )
		ORDER BY r.created_at DESC
	`;
}

async function consultParts(patientId: number, consultId: number) {
	const [consult] = await client`
		SELECT c.*, d.name AS doctor_name, d.credentials, d.specialty, d.practice, d.location
		FROM consultations c
		JOIN doctors d ON d.id = c.doctor_id
		WHERE c.id = ${consultId} AND c.patient_id = ${patientId}
	`;
	if (!consult) return null;
	const [entries, orders, tasks] = await Promise.all([
		client<VisitEntry[]>`SELECT id, kind, label, detail FROM consultation_entries WHERE consultation_id = ${consultId} ORDER BY id`,
		client<VisitOrder[]>`SELECT id, kind, title, detail, note, completes_on FROM consultation_orders WHERE consultation_id = ${consultId} ORDER BY id`,
		client<VisitTask[]>`SELECT id, title, detail, note, status FROM patient_tasks WHERE consultation_id = ${consultId} ORDER BY id`
	]);
	return { consult, entries, orders, tasks };
}

function visitShape(
	when: Date | string,
	fields: Omit<VisitRecord, 'when' | 'prescriptions' | 'referrals' | 'entries' | 'orders' | 'tasks'>,
	parts: { entries: VisitEntry[]; orders: VisitOrder[]; tasks: VisitTask[] },
	prescriptions: VisitRecord['prescriptions'],
	referrals: VisitReferral[]
): VisitRecord {
	return { when, ...fields, ...parts, prescriptions, referrals };
}

export async function visitByEncounter(patientId: number, encounterId: number, doctorId: number, pid: string) {
	const [visit] = await client`
		SELECT * FROM encounters WHERE id = ${encounterId} AND patient_id = ${patientId}
	`;
	if (!visit) return null;
	const linked = visit.consultation_id ? await consultParts(patientId, visit.consultation_id) : null;
	const day = isoDate(visit.occurred_on);
	const consultId = linked?.consult.id ?? null;
	const [prescriptions, referrals] = await Promise.all([
		prescriptionsOnVisit(patientId, day, visit.doctor_name, consultId),
		referralsOnVisit(patientId, day, visit.doctor_name, consultId)
	]);
	const open = linked?.consult.status === 'in_session' && linked.consult.doctor_id === doctorId;
	return visitShape(
		visit.occurred_on,
		{
			status: visit.status,
			code: linked?.consult.code ?? '',
			modality: linked?.consult.modality ?? '',
			doctor: visit.doctor_name,
			role: visit.doctor_role,
			practice: visit.practice ?? '',
			location: visit.location ?? '',
			kind: visit.kind,
			focus: visit.focus,
			findings: visit.findings ?? '',
			plan: visit.plan ?? '',
			narrative: linked && linked.consult.narrative !== visit.findings ? (linked.consult.narrative ?? '') : '',
			continueHref: open ? `/doctor/patients/${pid}/consult` : ''
		},
		linked ?? { entries: [], orders: [], tasks: [] },
		prescriptions,
		referrals
	);
}

export async function visitByConsult(patientId: number, consultId: number, doctorId: number, pid: string) {
	const linked = await consultParts(patientId, consultId);
	if (!linked) return null;
	const { consult, entries, orders, tasks } = linked;
	const doctor = [consult.doctor_name, consult.credentials].filter(Boolean).join(', ');
	const day = isoDate(consult.started_at);
	const [prescriptions, referrals] = await Promise.all([
		prescriptionsOnVisit(patientId, day, doctor, consult.id),
		referralsOnVisit(patientId, day, consult.doctor_name, consult.id)
	]);
	const open = consult.status === 'in_session' && consult.doctor_id === doctorId;
	return visitShape(
		consult.started_at,
		{
			status: consult.status,
			code: consult.code,
			modality: consult.modality ?? '',
			doctor,
			role: consult.specialty ?? '',
			practice: consult.practice ?? '',
			location: consult.location ?? '',
			kind: consult.specialty ? `${consult.specialty} Consult` : 'Consultation',
			focus: consult.narrative?.trim() ? consult.narrative.trim().split('\n')[0] : 'Consultation in progress',
			findings: '',
			plan: '',
			narrative: consult.narrative ?? '',
			continueHref: open ? `/doctor/patients/${pid}/consult` : ''
		},
		{ entries, orders, tasks },
		prescriptions,
		referrals
	);
}

export type SelfReportEdit = {
	changed_at: Date | string;
	changes: { field: string; from: string; to: string }[];
};

export async function selfReportsFor(patientId: number) {
	const rows = await client<
		{
			id: number;
			occurred_on: Date | string;
			title: string;
			detail: string | null;
			duration: string | null;
			severity: string | null;
			meds_taken: string | null;
			ongoing: boolean;
			created_at: Date | string;
		}[]
	>`
		SELECT * FROM self_reports WHERE patient_id = ${patientId} ORDER BY occurred_on DESC, id DESC
	`;
	if (!rows.length) return rows.map((row) => ({ ...row, edits: [] as SelfReportEdit[], files: [], alerted: [] as string[] }));
	const ids = rows.map((row) => row.id);
	const edits = await client<{ report_id: number; changed_at: Date | string; changes: SelfReportEdit['changes'] }[]>`
		SELECT report_id, changed_at, changes
		FROM self_report_edits
		WHERE report_id = ANY(${ids})
		ORDER BY changed_at DESC
	`;
	const files = await client<{ id: number; report_id: number; file_name: string; content_type: string }[]>`
		SELECT id, report_id, file_name, content_type
		FROM self_report_files
		WHERE report_id = ANY(${ids})
		ORDER BY id
	`;
	const alerts = await client<{ report_id: number; name: string }[]>`
		SELECT a.report_id, d.name
		FROM self_report_alerts a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.report_id = ANY(${ids})
		ORDER BY d.name
	`;
	return rows.map((row) => ({
		...row,
		edits: edits.filter((edit) => edit.report_id === row.id).map((edit) => ({ changed_at: edit.changed_at, changes: edit.changes })),
		files: files.filter((file) => file.report_id === row.id),
		alerted: alerts.filter((alert) => alert.report_id === row.id).map((alert) => alert.name)
	}));
}

export async function selfReportById(patientId: number, id: number) {
	const rows = await selfReportsFor(patientId);
	return rows.find((row) => row.id === id) ?? null;
}

export async function addSelfReport(
	patientId: number,
	input: {
		title: string;
		occurredOn: string;
		detail: string;
		duration: string;
		severity: string;
		meds: string;
		ongoing: boolean;
	}
) {
	const [row] = await client<{ id: number }[]>`
		INSERT INTO self_reports (
			patient_id, occurred_on, title, detail, duration, severity, meds_taken, ongoing, created_at
		) VALUES (
			${patientId}, ${input.occurredOn}, ${input.title}, ${input.detail || null}, ${input.duration || null},
			${input.severity || null}, ${input.meds || null}, ${input.ongoing}, ${nowLocal().stamp}
		)
		RETURNING id
	`;
	return row.id;
}

export async function addReportFile(reportId: number, fileName: string, storedName: string, contentType: string) {
	await client`
		INSERT INTO self_report_files (report_id, file_name, stored_name, content_type, created_at)
		VALUES (${reportId}, ${fileName}, ${storedName}, ${contentType}, ${nowLocal().stamp})
	`;
}

export async function reportFileFor(id: number) {
	const [file] = await client<
		{ id: number; report_id: number; patient_id: number; file_name: string; stored_name: string; content_type: string }[]
	>`
		SELECT f.id, f.report_id, r.patient_id, f.file_name, f.stored_name, f.content_type
		FROM self_report_files f
		JOIN self_reports r ON r.id = f.report_id
		WHERE f.id = ${id}
	`;
	return file ?? null;
}

export async function reportAlerted(reportId: number, doctorId: number) {
	const [row] = await client<{ id: number }[]>`
		SELECT id FROM self_report_alerts WHERE report_id = ${reportId} AND doctor_id = ${doctorId}
	`;
	return Boolean(row);
}

export async function alertClinicians() {
	return client<{ id: number; name: string; credentials: string; specialty: string }[]>`
		SELECT id, name, credentials, specialty
		FROM doctors
		WHERE user_id IS NOT NULL
		ORDER BY name
	`;
}

export async function alertReportDoctors(
	reportId: number,
	patient: { first_name: string; last_name: string; pid: string },
	doctorIds: number[],
	title: string
) {
	const ids = [...new Set(doctorIds.filter((id) => Number.isInteger(id) && id > 0))];
	if (!ids.length) return [] as string[];
	const doctors = await client<{ id: number; name: string; user_id: number | null }[]>`
		SELECT id, name, user_id FROM doctors WHERE id = ANY(${ids}) AND user_id IS NOT NULL
	`;
	const names: string[] = [];
	for (const doctor of doctors) {
		await client`
			INSERT INTO self_report_alerts (report_id, doctor_id, created_at)
			VALUES (${reportId}, ${doctor.id}, ${nowLocal().stamp})
			ON CONFLICT (report_id, doctor_id) DO NOTHING
		`;
		await notify(
			doctor.user_id,
			'Patient self report',
			`${patient.first_name} ${patient.last_name} (${patient.pid}) filed “${title}”.`
		);
		names.push(doctor.name);
	}
	return names;
}

export async function updateSelfReport(
	patientId: number,
	id: number,
	input: {
		title: string;
		occurredOn: string;
		detail: string;
		duration: string;
		severity: string;
		meds: string;
		ongoing: boolean;
	}
) {
	const current = await selfReportById(patientId, id);
	if (!current) return { error: 'That self report is not on this record.' };
	const before = {
		title: current.title,
		occurred_on: isoDate(current.occurred_on),
		detail: current.detail ?? '',
		duration: current.duration ?? '',
		severity: current.severity ?? '',
		meds_taken: current.meds_taken ?? '',
		ongoing: current.ongoing ? 'true' : 'false'
	};
	const after = {
		title: input.title,
		occurred_on: input.occurredOn,
		detail: input.detail,
		duration: input.duration,
		severity: input.severity,
		meds_taken: input.meds,
		ongoing: input.ongoing ? 'true' : 'false'
	};
	const changes = (Object.keys(before) as (keyof typeof before)[])
		.filter((field) => before[field] !== after[field])
		.map((field) => ({ field, from: before[field], to: after[field] }));
	if (!changes.length) return { unchanged: true as const };
	await client`
		UPDATE self_reports
		SET occurred_on = ${input.occurredOn}, title = ${input.title}, detail = ${input.detail || null},
			duration = ${input.duration || null}, severity = ${input.severity || null},
			meds_taken = ${input.meds || null}, ongoing = ${input.ongoing}
		WHERE id = ${id} AND patient_id = ${patientId}
	`;
	await client`
		INSERT INTO self_report_edits (report_id, changed_at, changes)
		VALUES (${id}, ${nowLocal().stamp}, ${JSON.stringify(changes)}::jsonb)
	`;
	return { saved: true as const };
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
	await ensureChartLinks(patientId);
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
	const rows = await client`
		SELECT * FROM imaging_studies WHERE patient_id = ${patientId} ORDER BY performed_on DESC NULLS LAST
	`;
	return resolveImagePaths(rows);
}

export async function imagingById(patientId: number, id: number) {
	const [row] = await client`
		SELECT * FROM imaging_studies WHERE patient_id = ${patientId} AND id = ${id}
	`;
	if (!row) return null;
	const [resolved] = await resolveImagePaths([row]);
	return resolved;
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
	await ensureChartLinks(patientId);
	return client`SELECT * FROM care_orders WHERE patient_id = ${patientId} ORDER BY id`;
}

export async function doseLogsFor(patientId: number) {
	return client`
		SELECT * FROM dose_logs WHERE patient_id = ${patientId} AND log_date = ${CLINIC_DAY} ORDER BY id
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

export async function markNotificationsSeen(userId: number) {
	await client`
		UPDATE notifications
		SET seen_at = ${nowLocal().stamp}
		WHERE user_id = ${userId} AND seen_at IS NULL
	`;
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

export async function openConsultsForDoctor(doctorId: number) {
	return client<{ id: number; started_at: Date | string; pid: string; first_name: string; last_name: string }[]>`
		SELECT c.id, c.started_at, p.pid, p.first_name, p.last_name
		FROM consultations c
		JOIN patients p ON p.id = c.patient_id
		WHERE c.doctor_id = ${doctorId} AND c.status = 'in_session'
		ORDER BY c.started_at DESC
	`;
}

export async function cancelConsult(consultId: number, doctorId: number) {
	const [consult] = await client`
		SELECT c.id, p.pid
		FROM consultations c
		JOIN patients p ON p.id = c.patient_id
		WHERE c.id = ${consultId} AND c.doctor_id = ${doctorId} AND c.status = 'in_session'
	`;
	if (!consult) return { error: 'That consultation is not open.' };
	await client`
		UPDATE referrals SET status = 'incoming', follow_consult_id = NULL
		WHERE follow_consult_id = ${consultId} AND status = 'in_session'
	`;
	const sourced = await client<
		{ id: number; user_id: number; first_name: string; last_name: string; pid: string; from_name: string }[]
	>`
		SELECT r.id, d.user_id, p.first_name, p.last_name, p.pid, f.name AS from_name
		FROM referrals r
		JOIN doctors d ON d.id = r.to_doctor_id
		JOIN doctors f ON f.id = r.from_doctor_id
		JOIN patients p ON p.id = r.patient_id
		WHERE r.source_consult_id = ${consultId} AND r.status = 'incoming'
	`;
	for (const referral of sourced) {
		await client`DELETE FROM referrals WHERE id = ${referral.id}`;
		const who = `${referral.first_name} ${referral.last_name} (${referral.pid})`;
		await notify(referral.user_id, 'Referral withdrawn', `${referral.from_name} withdrew the referral for ${who}.`);
	}
	await client`DELETE FROM consultations WHERE id = ${consultId} AND doctor_id = ${doctorId} AND status = 'in_session'`;
	return { pid: consult.pid as string };
}

export async function draftConsult(patientId: number, doctorId: number) {
	await ensureChartLinks(patientId);
	let [consult] = await client`
		SELECT * FROM consultations
		WHERE patient_id = ${patientId} AND doctor_id = ${doctorId} AND status = 'in_session'
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
			INSERT INTO consultations (patient_id, doctor_id, code, uid, status, modality, narrative, pharmacy, started_at)
			VALUES (
				${patientId}, ${doctorId}, ${'ENC-' + patientId}, ${recordUid('CON')}, 'in_session', 'in_person', '',
				NULL, NOW()
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
	const tasks = await client`
		SELECT * FROM patient_tasks WHERE consultation_id = ${consult.id} ORDER BY id
	`;
	return { ...consult, entries, orders, tasks };
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

export async function setConsultCompletion(consultId: number, completesOn: string | null) {
	await client`
		UPDATE consultations SET completes_on = ${completesOn}
		WHERE id = ${consultId} AND status = 'in_session'
	`;
}

export async function doctorById(id: number | null) {
	if (!id) return null;
	const [doctor] = await client`
		SELECT name, credentials, specialty, phone, practice, location FROM doctors WHERE id = ${id}
	`;
	return doctor ?? null;
}

export async function clinicianDirectory() {
	return client<{ id: number; name: string; credentials: string }[]>`
		SELECT id, name, credentials FROM doctors ORDER BY name
	`;
}

export async function clinicianById(id: number) {
	const [doctor] = await client`
		SELECT id, name, credentials, specialty, gender, practice, location, phone
		FROM doctors WHERE id = ${id}
	`;
	if (!doctor) return null;
	const hours = await doctorSchedule(id);
	return { ...doctor, hours, bookable: hours.length > 0 };
}

function recordUid(prefix: string) {
	return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function linkWords(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.split(' ')
		.filter((word) => word.length > 3);
}

function linkScore(left: string, right: string) {
	const words = new Set(linkWords(left));
	if (!words.size) return 0;
	return linkWords(right).filter((word) => words.has(word)).length;
}

function doctorNamed(orderedBy: string, doctorName: string) {
	const last = doctorName
		.toLowerCase()
		.replace(/^dr\.?\s+/, '')
		.split(' ')
		.filter(Boolean)
		.at(-1);
	return Boolean(last && last.length > 2 && orderedBy.toLowerCase().includes(last));
}

async function fillRecordUids() {
	await client`UPDATE consultations SET uid = 'CON-' || upper(substr(md5('CON' || id::text), 1, 6)) WHERE uid IS NULL`;
	await client`UPDATE consultation_orders SET uid = 'ORD-' || upper(substr(md5('ORD' || id::text), 1, 6)) WHERE uid IS NULL`;
	await client`UPDATE patient_tasks SET uid = 'TSK-' || upper(substr(md5('TSK' || id::text), 1, 6)) WHERE uid IS NULL`;
	await client`UPDATE care_orders SET uid = 'CRD-' || upper(substr(md5('CRD' || id::text), 1, 6)) WHERE uid IS NULL`;
	await client`UPDATE labs SET uid = 'LAB-' || upper(substr(md5('LAB' || id::text), 1, 6)) WHERE uid IS NULL`;
}

export async function ensureChartLinks(patientId: number, taskId?: number, fileName?: string) {
	await fillRecordUids();
	await client`
		UPDATE patient_tasks t
		SET order_uid = o.uid
		FROM consultation_orders o
		WHERE t.order_id = o.id AND t.patient_id = ${patientId} AND t.order_uid IS NULL
	`;
	const tasks = await client<
		{ id: number; consultation_id: number; title: string; order_id: number | null; file_name: string | null }[]
	>`
		SELECT id, consultation_id, title, order_id, file_name
		FROM patient_tasks
		WHERE patient_id = ${patientId} AND order_id IS NULL
	`;
	const orders = await client<{ id: number; uid: string; title: string; consultation_id: number }[]>`
		SELECT o.id, o.uid, o.title, o.consultation_id
		FROM consultation_orders o
		JOIN consultations c ON c.id = o.consultation_id
		WHERE c.patient_id = ${patientId} AND o.kind = 'test'
	`;
	const taken = new Set(
		(
			await client<{ order_id: number }[]>`
				SELECT order_id FROM patient_tasks
				WHERE patient_id = ${patientId} AND order_id IS NOT NULL
			`
		).map((row) => row.order_id)
	);
	for (const task of tasks) {
		const focus = task.id === taskId;
		const haystack = `${task.title} ${focus ? (fileName ?? task.file_name ?? '') : ''}`;
		const open = orders.filter((order) => !taken.has(order.id));
		const sameConsult = open.filter((order) => order.consultation_id === task.consultation_id);
		const pool = sameConsult.length ? sameConsult : open;
		let best = pool[0];
		let bestScore = -1;
		for (const order of pool) {
			const score = linkScore(haystack, order.title);
			if (score > bestScore) {
				best = order;
				bestScore = score;
			}
		}
		if (!best) continue;
		if (bestScore < 1 && !(sameConsult.length === 1)) continue;
		await client`
			UPDATE patient_tasks
			SET order_id = ${best.id}, order_uid = ${best.uid}
			WHERE id = ${task.id} AND order_id IS NULL
		`;
		taken.add(best.id);
	}
	for (const order of orders) {
		if (taken.has(order.id)) continue;
		await client`
			INSERT INTO patient_tasks (patient_id, consultation_id, uid, order_id, order_uid, title, status)
			VALUES (${patientId}, ${order.consultation_id}, ${recordUid('TSK')}, ${order.id}, ${order.uid}, ${order.title}, 'open')
		`;
		taken.add(order.id);
	}
	const consults = await client<{ id: number; uid: string; name: string }[]>`
		SELECT c.id, c.uid, d.name
		FROM consultations c
		JOIN doctors d ON d.id = c.doctor_id
		WHERE c.patient_id = ${patientId} AND c.uid IS NOT NULL
		ORDER BY c.id DESC
	`;
	const linkedOrders = await client<{ uid: string; title: string; consultation_uid: string }[]>`
		SELECT o.uid, o.title, c.uid AS consultation_uid
		FROM consultation_orders o
		JOIN consultations c ON c.id = o.consultation_id
		WHERE c.patient_id = ${patientId} AND o.kind = 'test' AND o.uid IS NOT NULL
	`;
	const pending = await client<{ id: number; title: string; ordered_by: string }[]>`
		SELECT id, title, ordered_by FROM care_orders
		WHERE patient_id = ${patientId} AND consultation_uid IS NULL
	`;
	for (const order of pending) {
		const titled = linkedOrders.find((item) => linkScore(order.title, item.title) > 0);
		const consult = titled
			? consults.find((item) => item.uid === titled.consultation_uid)
			: consults.find((item) => doctorNamed(order.ordered_by, item.name));
		if (!consult) continue;
		await client`
			UPDATE care_orders
			SET consultation_uid = ${consult.uid}, order_uid = ${titled?.uid ?? null}
			WHERE id = ${order.id}
		`;
	}
	const reports = await client<{ id: number; name: string; ordering_md: string | null }[]>`
		SELECT id, name, ordering_md FROM labs
		WHERE patient_id = ${patientId} AND consultation_uid IS NULL
	`;
	for (const report of reports) {
		const titled = linkedOrders.find((item) => linkScore(report.name, item.title) > 0);
		const consult = titled
			? consults.find((item) => item.uid === titled.consultation_uid)
			: consults.find((item) => doctorNamed(report.ordering_md ?? '', item.name));
		if (!consult) continue;
		await client`
			UPDATE labs
			SET consultation_uid = ${consult.uid}, order_uid = ${titled?.uid ?? null}
			WHERE id = ${report.id}
		`;
	}
}

export async function tasksForPatient(patientId: number) {
	await ensureChartLinks(patientId);
	return client`
		SELECT t.*, c.code AS consultation_code, c.uid AS consultation_uid, c.started_at, d.name AS doctor_name, d.id AS doctor_id
		FROM patient_tasks t
		JOIN consultations c ON c.id = t.consultation_id
		JOIN doctors d ON d.id = c.doctor_id
		WHERE t.patient_id = ${patientId}
		ORDER BY c.started_at DESC, t.consultation_id, t.id
	`;
}

export async function taskOwned(id: number, patientId: number) {
	const [task] = await client`SELECT * FROM patient_tasks WHERE id = ${id} AND patient_id = ${patientId}`;
	return task ?? null;
}

export async function saveTaskResult(id: number, patientId: number, fileName: string, storedName: string) {
	const [task] = await client`
		UPDATE patient_tasks
		SET status = 'received', file_name = ${fileName}, stored_name = ${storedName}, uploaded_at = NOW()
		WHERE id = ${id} AND patient_id = ${patientId}
		RETURNING id
	`;
	if (!task) return null;
	await ensureChartLinks(patientId, id, fileName);
	return task;
}

export async function taskFile(id: number) {
	const [task] = await client`
		SELECT id, patient_id, file_name, stored_name FROM patient_tasks WHERE id = ${id}
	`;
	return task ?? null;
}

type MedicineDoctor = { name: string; times: number };

function medicineDoctors(value: unknown): Record<string, MedicineDoctor> {
	let source = value;
	if (typeof source === 'string') {
		try {
			source = JSON.parse(source);
		} catch {
			return {};
		}
	}
	if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
	const doctors: Record<string, MedicineDoctor> = {};
	for (const [id, entry] of Object.entries(source)) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
		const row = entry as { name?: unknown; times?: unknown };
		const times = Number(row.times);
		doctors[id] = {
			name: typeof row.name === 'string' ? row.name : '',
			times: Number.isFinite(times) && times > 0 ? Math.floor(times) : 0
		};
	}
	return doctors;
}

export async function medicinesCatalog() {
	const rows = await client<{ id: number; name: string; description: string; doctors: unknown }[]>`
		SELECT id, name, description, doctors FROM medicines ORDER BY name
	`;
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description,
		doctors: medicineDoctors(row.doctors)
	}));
}

async function writeMedicineUse(doctorId: number, doctorName: string, name: string, description: string, delta: 1 | -1) {
	const label = name.trim();
	if (!label || !doctorId) return;
	await client.begin(async (sql) => {
		const [existing] = await sql<{ id: number; description: string; doctors: unknown }[]>`
			SELECT id, description, doctors FROM medicines WHERE lower(name) = lower(${label})
		`;
		const doctors = medicineDoctors(existing?.doctors);
		const key = String(doctorId);
		const next = (doctors[key]?.times ?? 0) + delta;
		if (next > 0) doctors[key] = { name: doctorName || doctors[key]?.name || '', times: next };
		else delete doctors[key];
		const kept = existing?.description?.trim() ? existing.description : description.trim();
		const usage = JSON.stringify(doctors);
		const tx = sql as typeof sql & { unsafe: (query: string, args: unknown[]) => Promise<unknown> };
		if (existing) {
			await tx.unsafe('UPDATE medicines SET description = $1, doctors = $2::jsonb WHERE id = $3', [
				kept,
				usage,
				existing.id
			]);
			return;
		}
		if (delta < 0) return;
		await tx.unsafe('INSERT INTO medicines (name, description, doctors) VALUES ($1, $2, $3::jsonb)', [
			label,
			kept,
			usage
		]);
	});
}

export function recordMedicineUse(doctorId: number, doctorName: string, name: string, description: string) {
	return writeMedicineUse(doctorId, doctorName, name, description, 1);
}

export function releaseMedicineUse(doctorId: number, name: string) {
	return writeMedicineUse(doctorId, '', name, '', -1);
}

export async function addConsultOrder(
	consultId: number,
	kind: string,
	title: string,
	detail: string,
	note: string,
	completesOn: string | null = null,
	tags = ''
) {
	const orderUid = recordUid('ORD');
	const [order] = await client`
		INSERT INTO consultation_orders (consultation_id, uid, kind, title, detail, note, completes_on, tags)
		VALUES (${consultId}, ${orderUid}, ${kind}, ${title}, ${detail}, ${note}, ${completesOn}, ${tags || null})
		RETURNING id
	`;
	const label = title.trim();
	if (kind === 'test' && label) {
		const [consult] = await client`SELECT patient_id, uid FROM consultations WHERE id = ${consultId}`;
		if (consult) {
			await client`
				INSERT INTO patient_tasks (patient_id, consultation_id, uid, order_id, order_uid, title, detail, note, status)
				VALUES (${consult.patient_id}, ${consultId}, ${recordUid('TSK')}, ${order.id}, ${orderUid}, ${label}, ${detail}, ${note}, 'open')
			`;
			if (consult.uid) {
				await client`
					UPDATE care_orders
					SET consultation_uid = ${consult.uid}, order_uid = ${orderUid}
					WHERE patient_id = ${consult.patient_id}
					  AND consultation_uid IS NULL
					  AND title = ${label}
				`;
			}
		}
	}
}

export async function referralDoctors() {
	return client<
		{
			id: number;
			name: string;
			credentials: string;
			specialty: string;
			practice: string;
			location: string;
			has_login: boolean;
		}[]
	>`
		SELECT id, name, credentials, specialty, practice, location, (user_id IS NOT NULL) AS has_login
		FROM doctors
		ORDER BY name
	`;
}

export type IncomingReferral = {
	id: number;
	patient_id: number;
	note: string | null;
	status: 'incoming' | 'in_session' | 'completed';
	created_at: Date | string;
	pid: string;
	first_name: string;
	last_name: string;
	dob: Date | string;
	sex: string;
	from_name: string;
	from_id: number;
};

export async function incomingReferrals(doctorId: number) {
	return client<IncomingReferral[]>`
		SELECT r.id, r.patient_id, r.note, r.status, r.created_at,
			p.pid, p.first_name, p.last_name, p.dob, p.sex,
			fd.name AS from_name, fd.id AS from_id
		FROM referrals r
		JOIN patients p ON p.id = r.patient_id
		JOIN doctors fd ON fd.id = r.from_doctor_id
		WHERE r.to_doctor_id = ${doctorId}
		ORDER BY CASE r.status WHEN 'incoming' THEN 0 WHEN 'in_session' THEN 1 ELSE 2 END,
			r.created_at DESC, r.id DESC
	`;
}

export async function referralForFollowUp(consultId: number) {
	const [row] = await client<{ id: number; note: string | null; status: string; from_name: string }[]>`
		SELECT r.id, r.note, r.status, d.name AS from_name
		FROM referrals r
		JOIN doctors d ON d.id = r.from_doctor_id
		WHERE r.follow_consult_id = ${consultId}
		LIMIT 1
	`;
	return row ?? null;
}

async function notify(userId: number | null, title: string, body: string) {
	if (!userId) return;
	await client`
		INSERT INTO notifications (user_id, title, body, created_at)
		VALUES (${userId}, ${title}, ${body}, ${nowLocal().stamp})
	`;
}

export async function addReferral(consultId: number, fromDoctorId: number, toDoctorId: number, note: string) {
	if (!toDoctorId || fromDoctorId === toDoctorId) return { error: 'Choose another clinician from the registry.' };
	const [consult] = await client`SELECT * FROM consultations WHERE id = ${consultId} AND status = 'in_session'`;
	if (!consult || consult.doctor_id !== fromDoctorId) return { error: 'This consultation is no longer open.' };
	const [target] = await client`SELECT * FROM doctors WHERE id = ${toDoctorId}`;
	if (!target) return { error: 'Choose a specialist from the registry.' };
	const [existing] = await client`
		SELECT id FROM referrals
		WHERE source_consult_id = ${consultId} AND to_doctor_id = ${toDoctorId} AND status <> 'completed'
	`;
	if (existing) return { error: 'This clinician is already on the referral list.' };
	const [patient] = await client<{ first_name: string; last_name: string; pid: string; user_id: number | null }[]>`
		SELECT first_name, last_name, pid, user_id FROM patients WHERE id = ${consult.patient_id}
	`;
	const [from] = await client`SELECT name FROM doctors WHERE id = ${fromDoctorId}`;
	if (!patient || !from) return { error: 'That patient could not be found.' };
	const title = target.credentials ? `${target.name}, ${target.credentials}` : target.name;
	const detail = [target.specialty, target.practice].filter(Boolean).join(' · ');
	const [order] = await client`
		INSERT INTO consultation_orders (consultation_id, kind, title, detail, note)
		VALUES (${consultId}, 'referral', ${title}, ${detail}, ${note})
		RETURNING id
	`;
	await client`
		INSERT INTO referrals (
			patient_id, from_doctor_id, to_doctor_id, source_consult_id, order_id, note, status, created_at
		) VALUES (
			${consult.patient_id}, ${fromDoctorId}, ${toDoctorId}, ${consultId}, ${order.id}, ${note}, 'incoming', ${nowLocal().stamp}
		)
	`;
	await grantAccess(consult.patient_id, toDoctorId, 'referral');
	const who = `${patient.first_name} ${patient.last_name} (${patient.pid})`;
	const body = note ? `${from.name} referred ${who}. ${note}` : `${from.name} referred ${who} for ${target.specialty}.`;
	await notify(target.user_id, 'Incoming referral', body);
	await notify(
		patient.user_id,
		'Specialist added',
		`${target.name} can now view your record because ${from.name} referred you.`
	);
	return { saved: true as const };
}

export async function startConsultForReferral(referralId: number, doctorId: number) {
	const [referral] = await client`
		SELECT * FROM referrals WHERE id = ${referralId} AND to_doctor_id = ${doctorId}
	`;
	if (!referral) return { error: 'That referral is not on your list.' };
	if (referral.status === 'completed') return { error: 'This referral is already complete.' };
	await grantAccess(referral.patient_id, doctorId, 'referral');
	const [patient] = await client`SELECT pid FROM patients WHERE id = ${referral.patient_id}`;
	if (referral.follow_consult_id) {
		const [existing] = await client`
			SELECT id, status FROM consultations
			WHERE id = ${referral.follow_consult_id} AND doctor_id = ${doctorId}
		`;
		if (existing?.status === 'in_session') return { pid: patient.pid as string };
	}
	const consult = await draftConsult(referral.patient_id, doctorId);
	await client`
		UPDATE referrals SET status = 'in_session', follow_consult_id = ${consult.id}
		WHERE id = ${referralId}
	`;
	return { pid: patient.pid as string };
}

export async function removeConsultOrder(id: number) {
	const [order] = await client<{ id: number; kind: string; title: string; consultation_id: number }[]>`
		SELECT id, kind, title, consultation_id FROM consultation_orders WHERE id = ${id}
	`;
	if (order?.kind === 'referral') {
		const [referral] = await client`
			SELECT r.id, r.status, r.note, d.user_id, p.first_name, p.last_name, p.pid, f.name AS from_name
			FROM referrals r
			JOIN doctors d ON d.id = r.to_doctor_id
			JOIN doctors f ON f.id = r.from_doctor_id
			JOIN patients p ON p.id = r.patient_id
			WHERE r.order_id = ${id}
		`;
		if (referral?.status === 'incoming') {
			await client`DELETE FROM referrals WHERE id = ${referral.id}`;
			const who = `${referral.first_name} ${referral.last_name} (${referral.pid})`;
			await notify(referral.user_id, 'Referral withdrawn', `${referral.from_name} withdrew the referral for ${who}.`);
		}
	}
	await client`DELETE FROM patient_tasks WHERE order_id = ${id} AND stored_name IS NULL`;
	if (order?.kind === 'medication') {
		const [consult] = await client<{ doctor_id: number }[]>`
			SELECT doctor_id FROM consultations WHERE id = ${order.consultation_id}
		`;
		if (consult) await releaseMedicineUse(consult.doctor_id, order.title);
	}
	await client`DELETE FROM consultation_orders WHERE id = ${id}`;
}

function nowLocal() {
	const stamp = localStamp(new Date());
	return { date: stamp.slice(0, 10), stamp };
}

export async function finalizeConsult(consultId: number, completesOn: string | null) {
	const [consult] = await client`SELECT * FROM consultations WHERE id = ${consultId}`;
	if (!consult || consult.status !== 'in_session') return;
	await ensureChartLinks(consult.patient_id);
	const [linked] = await client<{ uid: string | null }[]>`SELECT uid FROM consultations WHERE id = ${consultId}`;
	consult.uid = linked?.uid ?? consult.uid;
	const orders = await client`SELECT * FROM consultation_orders WHERE consultation_id = ${consultId}`;
	const meds = orders.filter((order) => order.kind === 'medication');
	const completion = completesOn || isoDate(consult.completes_on) || null;
	if (meds.length && !completion) return { error: 'Set a completion date for the prescription.' };
	if (completion) {
		await client`UPDATE consultations SET completes_on = ${completion} WHERE id = ${consultId}`;
	}
	const [doctor] = await client`SELECT * FROM doctors WHERE id = ${consult.doctor_id}`;
	const { date, stamp } = nowLocal();
	await client`
		INSERT INTO encounters (patient_id, doctor_name, doctor_role, practice, occurred_on, kind, focus, findings, plan, location, status, consultation_id)
		VALUES (
			${consult.patient_id}, ${doctor.name}, ${doctor.specialty}, ${doctor.practice},
			${date}, ${`${doctor.specialty} Consult`}, 'Signed consultation',
			${consult.narrative}, 'Orders authorized and transmitted.', ${doctor.location}, 'finalized', ${consult.id}
		)
	`;
	if (meds.length) {
		const [rx] = await client`
			INSERT INTO prescriptions (
				patient_id, code, prescriber, specialty, facility, pharmacy, ordered_at, status, course_label, completes_on
			)
			VALUES (
				${consult.patient_id}, ${'RX-' + consult.id}, ${doctor.name}, ${doctor.specialty},
				${doctor.location}, NULL, ${stamp}, 'active', 'Signed during consultation', ${completion}
			)
			RETURNING id
		`;
		for (const [index, med] of meds.entries()) {
			const marks = tagsFrom(med.tags);
			const sig = [med.detail, marks.frequency, marks.meal].filter(Boolean).join('. ');
			await client`
				INSERT INTO prescription_items (
					prescription_id, name, strength, form, sig, indication, supply_label, refills, sort_order, completes_on,
					frequency, schedule_detail
				) VALUES (
					${rx.id}, ${med.title}, ${med.detail}, 'Oral', ${sig}, ${med.note}, ${med.detail}, '0', ${index},
					${isoDate(med.completes_on) || null}, ${marks.frequency || null}, ${marks.meal || null}
				)
			`;
		}
	}
	for (const order of orders.filter((item) => item.kind === 'test')) {
		await client`
			INSERT INTO care_orders (patient_id, uid, consultation_uid, order_uid, kind, title, ordered_by, status, schedule_label, instructions)
			VALUES (
				${consult.patient_id}, ${recordUid('CRD')}, ${consult.uid}, ${order.uid}, 'diagnostic', ${order.title}, ${doctor.name}, ${order.detail},
				${'Ordered ' + formatDate(date)}, ${order.note}
			)
		`;
	}
	const [chart] = await client`SELECT insurance_name FROM patients WHERE id = ${consult.patient_id}`;
	const fee = 80;
	const [invoice] = await client`
		INSERT INTO invoices (patient_id, code, title, issued_on, due_on, status, insurance_note, patient_due)
		VALUES (
			${consult.patient_id}, ${'INV-' + consult.id}, 'Clinic consultation', ${date}, ${addDays(date, 30)},
			'pending', ${chart?.insurance_name ? `Billed to ${chart.insurance_name}` : 'Due from the patient'}, ${fee}
		)
		RETURNING id
	`;
	await client`
		INSERT INTO invoice_lines (invoice_id, description, amount)
		VALUES (${invoice.id}, 'Doctor consultation fee', ${fee})
	`;
	await client`UPDATE consultations SET status = 'signed' WHERE id = ${consultId}`;
	await client`UPDATE referrals SET status = 'completed' WHERE follow_consult_id = ${consultId}`;
	return { medications: meds.length };
}

export async function logVital(patientId: number, systolic: number, diastolic: number, heartRate: number, source: string) {
	await client`
		INSERT INTO vitals (patient_id, recorded_at, systolic, diastolic, heart_rate, source, note)
		VALUES (${patientId}, ${nowLocal().stamp}, ${systolic}, ${diastolic}, ${heartRate}, ${source}, 'Logged from the patient portal')
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
		SET status = 'paid', paid_via = ${method}, paid_on = ${nowLocal().date}
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
				${nowLocal().stamp}, 'active', 'Patient-reported supplement'
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
		INSERT INTO labs (patient_id, uid, name, category, status, facility, ordering_md, acknowledged)
		VALUES (${patientId}, ${recordUid('LAB')}, ${name}, 'Ordered', 'pending', ${facility}, ${orderingMd}, false)
	`;
	await ensureChartLinks(patientId);
}

type AccessSource = 'primary' | 'appointment' | 'referral' | 'qr' | 'code' | 'request' | 'registered';

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeAccessCode(raw: string) {
	const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
	if (compact.length !== 8) return null;
	return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function recordPayload(token: string) {
	return `careos:${token}`;
}

function tokenFromPayload(raw: string) {
	const match = raw.trim().match(/^careos:([a-f0-9]{48})$/i);
	return match?.[1]?.toLowerCase() ?? null;
}

export async function ensureRecordToken(patientId: number) {
	const [row] = await client<{ record_token: string | null }[]>`
		SELECT record_token FROM patients WHERE id = ${patientId}
	`;
	if (row?.record_token) return row.record_token;
	const value = randomBytes(24).toString('hex');
	await client`
		UPDATE patients SET record_token = ${value}
		WHERE id = ${patientId} AND record_token IS NULL
	`;
	const [again] = await client<{ record_token: string }[]>`
		SELECT record_token FROM patients WHERE id = ${patientId}
	`;
	return again.record_token;
}

export async function accessStatus(patientId: number, doctorId: number) {
	const [row] = await client<{ status: string }[]>`
		SELECT status FROM patient_access
		WHERE patient_id = ${patientId} AND doctor_id = ${doctorId}
	`;
	return row?.status ?? 'none';
}

export async function grantAccess(patientId: number, doctorId: number, source: AccessSource) {
	await client`
		INSERT INTO patient_access (patient_id, doctor_id, status, source, created_at)
		VALUES (${patientId}, ${doctorId}, 'granted', ${source}, ${nowLocal().stamp})
		ON CONFLICT (patient_id, doctor_id)
		DO UPDATE SET status = 'granted', source = EXCLUDED.source
	`;
}

export async function requestChartAccess(patientId: number, doctorId: number) {
	const current = await accessStatus(patientId, doctorId);
	if (current === 'granted' || current === 'pending' || current === 'revoked') return current;
	const [patient] = await client<{ user_id: number | null }[]>`
		SELECT user_id FROM patients WHERE id = ${patientId}
	`;
	if (!patient?.user_id) return 'no_portal' as const;
	await client`
		INSERT INTO patient_access (patient_id, doctor_id, status, source, created_at)
		VALUES (${patientId}, ${doctorId}, 'pending', 'request', ${nowLocal().stamp})
		ON CONFLICT (patient_id, doctor_id)
		DO UPDATE SET status = 'pending', source = 'request', created_at = EXCLUDED.created_at
		WHERE patient_access.status <> 'granted'
	`;
	const [doctor] = await client<{ name: string }[]>`SELECT name FROM doctors WHERE id = ${doctorId}`;
	await notify(
		patient.user_id,
		'Record access request',
		`${doctor?.name ?? 'A clinician'} is asking to open your medical record. Allow or deny this from your home page or My physicians.`
	);
	return 'requested' as const;
}

export async function decideChartAccess(patientId: number, accessId: number, allow: boolean) {
	const [row] = await client<{ doctor_id: number }[]>`
		UPDATE patient_access
		SET status = ${allow ? 'granted' : 'denied'}
		WHERE id = ${accessId} AND patient_id = ${patientId} AND status = 'pending'
		RETURNING doctor_id
	`;
	if (!row) return false;
	const [doctor] = await client<{ user_id: number | null }[]>`
		SELECT user_id FROM doctors WHERE id = ${row.doctor_id}
	`;
	const [patient] = await client<{ first_name: string; last_name: string; pid: string }[]>`
		SELECT first_name, last_name, pid FROM patients WHERE id = ${patientId}
	`;
	const who = `${patient.first_name} ${patient.last_name} (${patient.pid})`;
	await notify(
		doctor?.user_id ?? null,
		allow ? 'Record access allowed' : 'Record access declined',
		allow ? `${who} allowed you to open their medical record.` : `${who} declined access to their medical record.`
	);
	return true;
}

export async function physiciansFor(patientId: number) {
	return client<{ id: number; name: string; credentials: string; specialty: string; practice: string; status: string }[]>`
		SELECT d.id, d.name, d.credentials, d.specialty, d.practice, a.status
		FROM patient_access a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.patient_id = ${patientId} AND a.status IN ('granted', 'revoked')
		ORDER BY d.name
	`;
}

export async function setRecordAccess(patientId: number, doctorId: number, allow: boolean) {
	const [row] = await client<{ doctor_id: number }[]>`
		UPDATE patient_access
		SET status = ${allow ? 'granted' : 'revoked'}
		WHERE patient_id = ${patientId} AND doctor_id = ${doctorId} AND status IN ('granted', 'revoked')
		RETURNING doctor_id
	`;
	if (!row) return { error: 'That clinician is not on your list.' };
	const [doctor] = await client<{ user_id: number | null; name: string }[]>`
		SELECT user_id, name FROM doctors WHERE id = ${doctorId}
	`;
	const [patient] = await client<{ first_name: string; last_name: string; pid: string }[]>`
		SELECT first_name, last_name, pid FROM patients WHERE id = ${patientId}
	`;
	const who = `${patient.first_name} ${patient.last_name} (${patient.pid})`;
	await notify(
		doctor?.user_id ?? null,
		allow ? 'Record access turned on' : 'Record access turned off',
		allow
			? `${who} turned your access to their medical record back on.`
			: `${who} turned off your access to their medical record. Scan their QR code or enter their access code to open it again.`
	);
	return { ok: true as const, name: doctor?.name ?? 'This clinician' };
}

export async function pendingChartRequests(patientId: number) {
	return client<{ id: number; created_at: Date | string; name: string; credentials: string; specialty: string }[]>`
		SELECT a.id, a.created_at, d.name, d.credentials, d.specialty
		FROM patient_access a
		JOIN doctors d ON d.id = a.doctor_id
		WHERE a.patient_id = ${patientId} AND a.status = 'pending'
		ORDER BY a.created_at DESC
	`;
}

export async function activeAccessCode(patientId: number) {
	const [row] = await client<{ code: string; expires_at: Date | string }[]>`
		SELECT code, expires_at FROM access_codes
		WHERE patient_id = ${patientId}
		  AND used_at IS NULL
		  AND expires_at > ${nowLocal().stamp}
		ORDER BY id DESC
		LIMIT 1
	`;
	return row ?? null;
}

export async function createAccessCode(patientId: number) {
	const stamp = nowLocal().stamp;
	const expires = localStamp(new Date(Date.now() + 24 * 60 * 60 * 1000));
	await client`
		UPDATE access_codes SET used_at = ${stamp}
		WHERE patient_id = ${patientId} AND used_at IS NULL
	`;
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const bytes = randomBytes(8);
		let body = '';
		for (const byte of bytes) body += codeAlphabet[byte % codeAlphabet.length];
		const code = `${body.slice(0, 4)}-${body.slice(4)}`;
		try {
			await client`
				INSERT INTO access_codes (patient_id, code, created_at, expires_at)
				VALUES (${patientId}, ${code}, ${stamp}, ${expires})
			`;
			return { code, expires_at: expires };
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === '23505') continue;
			throw error;
		}
	}
	throw new Error('Could not create an access code');
}

async function announceCode(patientId: number, doctorId: number) {
	const [doctor] = await client<{ name: string }[]>`SELECT name FROM doctors WHERE id = ${doctorId}`;
	const [patient] = await client<{ user_id: number | null; pid: string }[]>`
		SELECT user_id, pid FROM patients WHERE id = ${patientId}
	`;
	await notify(
		patient.user_id,
		'Record access granted',
		`${doctor?.name ?? 'A clinician'} used your access code and can now view your full medical history.`
	);
	return patient.pid;
}

export async function redeemAccessCode(doctorId: number, raw: string) {
	const code = normalizeAccessCode(raw);
	if (!code) return { error: 'Enter the 8-character access code.' };
	const stamp = nowLocal().stamp;
	const [row] = await client<{ patient_id: number }[]>`
		UPDATE access_codes
		SET used_at = ${stamp}, used_by = ${doctorId}
		WHERE code = ${code} AND used_at IS NULL AND expires_at > ${stamp}
		RETURNING patient_id
	`;
	if (!row) return { error: 'That access code is not active. Ask the patient for a new one.' };
	await grantAccess(row.patient_id, doctorId, 'code');
	const pid = await announceCode(row.patient_id, doctorId);
	return { pid };
}

export async function redeemRecordToken(doctorId: number, payload: string) {
	const token = tokenFromPayload(payload);
	if (!token) return { error: 'That QR code is not a careOS record.' };
	const [patient] = await client<{ id: number; pid: string; user_id: number | null }[]>`
		SELECT id, pid, user_id FROM patients WHERE record_token = ${token}
	`;
	if (!patient) return { error: 'That QR code is not a careOS record.' };
	const current = await accessStatus(patient.id, doctorId);
	await grantAccess(patient.id, doctorId, 'qr');
	if (current !== 'granted') {
		const [doctor] = await client<{ name: string }[]>`SELECT name FROM doctors WHERE id = ${doctorId}`;
		await notify(
			patient.user_id,
			'Record access granted',
			`${doctor?.name ?? 'A clinician'} scanned your record code and can now view your full medical history.`
		);
	}
	return { pid: patient.pid };
}
