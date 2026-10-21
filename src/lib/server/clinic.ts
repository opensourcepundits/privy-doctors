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
		  AND a.starts_at::date > DATE '2024-11-17'
		ORDER BY a.starts_at
		LIMIT 1
	`;
	return row ?? null;
}

export async function createWalkInPatient(
	doctorId: number,
	input: { firstName: string; lastName: string; dob: string; sex: string; phone: string; nic: string }
) {
	const [patient] = await client`
		INSERT INTO patients (
			primary_doctor_id, pid, first_name, last_name, dob, sex, phone, nic, concierge_note
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
			${input.nic},
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
