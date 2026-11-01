import { formatDate } from '#lib/format';
import {
	patientByPid,
	prescriptionPhotoBytes,
	visitByConsult,
	visitByEncounter,
	type PatientRow,
	type VisitRecord
} from '#lib/server/clinic';
import { client } from './db';
import type { ConsultationReport, ReportItem, ReportLine, ReportPrescription } from '#lib/server/consult-pdf';

type Clinician = {
	id: number;
	name: string;
	credentials: string;
	specialty: string;
	npi: string | null;
	practice: string;
	location: string;
	phone: string | null;
};

function text(value: unknown) {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '';
}

function recordOf(value: unknown) {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function when(value: unknown): Date | string | null {
	if (value instanceof Date || typeof value === 'string') return value;
	return null;
}

function amount(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
	return null;
}

function strings(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.map((item) => text(item)).filter(Boolean);
}

function fileName(patient: PatientRow, code: string, id: number) {
	const raw = `${patient.last_name}-${patient.first_name}-${code || `visit-${id}`}-report`;
	const ascii = raw
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9._-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	return `${ascii || 'consultation-report'}.pdf`;
}

function insuranceOf(patient: PatientRow) {
	return [patient.insurance_name, patient.insurance_group ? `Group ${patient.insurance_group}` : '', patient.insurance_member ? `Member ${patient.insurance_member}` : '']
		.filter(Boolean)
		.join(' · ');
}

function surgeriesOf(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = recordOf(item);
		const name = text(row.name);
		if (!name) return [];
		return [{ year: text(row.year), name }];
	});
}

function itemsOf(value: unknown): ReportItem[] {
	if (!Array.isArray(value)) return [];
	return value.map((item) => {
		const row = recordOf(item);
		return {
			name: text(row.name),
			strength: text(row.strength),
			form: text(row.form),
			route: text(row.route),
			frequency: text(row.frequency),
			sig: text(row.sig),
			indication: text(row.indication),
			quantity: amount(row.quantity),
			supply: text(row.supply_label),
			refills: text(row.refills),
			completesOn: when(row.completes_on),
			scheduleDetail: text(row.schedule_detail)
		};
	});
}

function prescriptionsOf(record: VisitRecord): ReportPrescription[] {
	return record.prescriptions.map((order) => {
		const row = recordOf(order);
		return {
			code: text(row.code),
			orderedAt: when(row.ordered_at),
			status: text(row.status),
			completesOn: when(row.completes_on),
			prescriber: text(row.prescriber),
			specialty: text(row.specialty),
			facility: text(row.facility),
			pharmacy: text(row.pharmacy),
			course: text(row.course_label),
			authThrough: text(row.auth_through),
			items: itemsOf(row.items)
		};
	});
}

function orderLine(order: VisitRecord['orders'][number]): ReportLine {
	return {
		title: order.title,
		detail: order.detail ?? '',
		note: order.note ?? '',
		meta: order.completes_on ? `Completes ${formatDate(order.completes_on)}` : ''
	};
}

function taskLine(task: VisitRecord['tasks'][number]): ReportLine {
	return {
		title: task.title,
		detail: task.detail ?? '',
		note: task.note ?? '',
		meta: task.status ? task.status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : ''
	};
}

async function photosOf(record: VisitRecord) {
	return Promise.all(
		record.photos.map(async (photo) => {
			let bytes: Buffer | null = null;
			try {
				bytes = await prescriptionPhotoBytes(photo.id);
			} catch {
				bytes = null;
			}
			return {
				name: photo.file_name,
				type: photo.content_type,
				bytes: bytes ? new Uint8Array(bytes) : null
			};
		})
	);
}

function reportFrom(
	patient: PatientRow,
	clinician: Clinician,
	record: VisitRecord,
	extra: { pharmacy: string; completesOn: Date | string | null; filename: string; timed: boolean }
): ConsultationReport {
	const medications = record.prescriptions.length ? [] : record.orders.filter((order) => order.kind === 'medication').map(orderLine);
	return {
		filename: extra.filename,
		timed: extra.timed,
		generatedAt: new Date(),
		patient: {
			name: `${patient.first_name} ${patient.last_name}`.trim(),
			pid: patient.pid,
			dob: patient.dob,
			sex: patient.sex,
			bloodType: patient.blood_type ?? '',
			phone: patient.phone ?? '',
			allergies: strings(patient.allergies),
			conditions: strings(patient.conditions),
			surgeries: surgeriesOf(patient.surgeries),
			insurance: insuranceOf(patient)
		},
		clinician: {
			name: clinician.name,
			credentials: clinician.credentials,
			specialty: clinician.specialty,
			npi: clinician.npi ?? '',
			practice: record.practice || clinician.practice,
			location: record.location || clinician.location,
			phone: clinician.phone ?? ''
		},
		visit: {
			when: record.when,
			status: record.status,
			code: record.code,
			modality: record.modality,
			kind: record.kind,
			focus: record.focus,
			findings: record.findings,
			plan: record.plan,
			narrative: record.narrative,
			pharmacy: extra.pharmacy,
			completesOn: extra.completesOn,
			doctor: record.doctor,
			role: record.role,
			practice: record.practice,
			location: record.location
		},
		entries: record.entries.map((entry) => ({
			kind: entry.kind,
			label: entry.label,
			detail: entry.detail ?? ''
		})),
		prescriptions: prescriptionsOf(record),
		medications,
		tests: record.orders.filter((order) => order.kind === 'test').map(orderLine),
		referralOrders: record.orders.filter((order) => order.kind === 'referral').map(orderLine),
		otherOrders: record.orders.filter((order) => !['medication', 'test', 'referral'].includes(order.kind)).map(orderLine),
		tasks: record.tasks.map(taskLine),
		referrals: record.referrals.map((referral) => ({
			fromName: [referral.from_name, referral.from_credentials].filter(Boolean).join(', '),
			toName: referral.to_name,
			toSpecialty: referral.to_specialty,
			toCredentials: referral.to_credentials,
			status: referral.status,
			createdAt: referral.created_at,
			note: referral.note ?? ''
		})),
		photos: []
	};
}

export async function loadConsultationReport(clinician: Clinician, kind: string, rawId: string): Promise<ConsultationReport | null> {
	const id = Number(rawId);
	if (!Number.isInteger(id) || id <= 0) return null;
	if (kind === 'consult') return consultReport(clinician, id);
	if (kind === 'encounter') return encounterReport(clinician, id);
	return null;
}

async function consultReport(clinician: Clinician, id: number) {
	const [owned] = await client<
		{ id: number; patient_id: number; pid: string; pharmacy: string | null; completes_on: Date | string | null }[]
	>`
		SELECT c.id, c.patient_id, p.pid, c.pharmacy, c.completes_on
		FROM consultations c
		JOIN patients p ON p.id = c.patient_id
		WHERE c.id = ${id}
		  AND c.doctor_id = ${clinician.id}
		  AND c.status = 'signed'
		  AND c.code NOT LIKE 'VIS-%'
		  AND EXISTS (
			SELECT 1 FROM patient_access a
			WHERE a.patient_id = c.patient_id AND a.doctor_id = ${clinician.id} AND a.status = 'granted'
		  )
	`;
	if (!owned) return null;
	const [patient, record] = await Promise.all([
		client<PatientRow[]>`SELECT * FROM patients WHERE id = ${owned.patient_id}`.then((rows) => rows[0] ?? null),
		visitByConsult(owned.patient_id, owned.id, clinician.id, owned.pid)
	]);
	if (!patient || !record) return null;
	const report = reportFrom(patient, clinician, record, {
		pharmacy: owned.pharmacy ?? '',
		completesOn: owned.completes_on,
		filename: fileName(patient, record.code, owned.id),
		timed: true
	});
	report.photos = await photosOf(record);
	return report;
}

async function encounterReport(clinician: Clinician, id: number) {
	const [owned] = await client<{ id: number; patient_id: number; pid: string; consultation_id: number | null }[]>`
		SELECT e.id, e.patient_id, p.pid, e.consultation_id
		FROM encounters e
		JOIN patients p ON p.id = e.patient_id
		JOIN doctors d ON d.id = ${clinician.id}
		WHERE e.id = ${id}
		  AND e.doctor_name ILIKE d.name || '%'
		  AND (
			e.consultation_id IS NULL
			OR NOT EXISTS (
				SELECT 1 FROM consultations c
				WHERE c.id = e.consultation_id
				  AND c.doctor_id = ${clinician.id}
				  AND c.status = 'signed'
				  AND c.code NOT LIKE 'VIS-%'
			)
		  )
		  AND EXISTS (
			SELECT 1 FROM patient_access a
			WHERE a.patient_id = e.patient_id AND a.doctor_id = ${clinician.id} AND a.status = 'granted'
		  )
	`;
	if (!owned) return null;
	const patient = await patientByPid(owned.pid);
	const record = await visitByEncounter(owned.patient_id, owned.id, clinician.id, owned.pid);
	if (!patient || !record) return null;
	let pharmacy = '';
	let completesOn: Date | string | null = null;
	if (owned.consultation_id) {
		const [consult] = await client<{ pharmacy: string | null; completes_on: Date | string | null }[]>`
			SELECT pharmacy, completes_on FROM consultations WHERE id = ${owned.consultation_id}
		`;
		pharmacy = consult?.pharmacy ?? '';
		completesOn = consult?.completes_on ?? null;
	}
	const report = reportFrom(patient, clinician, record, {
		pharmacy,
		completesOn,
		filename: fileName(patient, record.code, owned.id),
		timed: false
	});
	report.photos = await photosOf(record);
	return report;
}
