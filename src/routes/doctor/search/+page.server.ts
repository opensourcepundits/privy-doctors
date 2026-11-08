import { fail, redirect } from '@sveltejs/kit';
import { liveDay } from '#lib/format';
import { createWalkInPatient, doctorForUser, draftConsult, patientByPid, requestChartAccess, searchPatients, type PatientRow } from '#lib/server/clinic';

const sexes = ['Female', 'Male'] as const;

function doctorFrom(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/doctors/login');
	return doctorForUser(locals.user.id);
}

function forDoctor(patient: PatientRow & { access: string }) {
	const hasPortal = Boolean(patient.user_id);
	const shared = { ...patient, record_token: null, user_id: null, invite_token: null, has_portal: hasPortal };
	if (patient.access === 'granted') return shared;
	return {
		...shared,
		blood_type: null,
		allergies: [],
		conditions: [],
		surgeries: [],
		phone: null,
		nic: null,
		passport: null,
		concierge_note: null,
		insurance_name: null,
		insurance_group: null,
		insurance_member: null,
		pharmacy_name: null,
		pharmacy_address: null,
		pharmacy_phone: null
	};
}

export function load({ url, locals }: { url: URL; locals: App.Locals }) {
	const q = url.searchParams.get('q') ?? '';
	const intent = url.searchParams.get('intent');
	return { q, intent, patients: roster(locals, q, intent) };
}

async function roster(locals: App.Locals, q: string, intent: string | null) {
	if (!locals.user) return [];
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) return [];
	const rows = await searchPatients(doctor.id, intent === 'consult' ? '' : q);
	return rows.map(forDoctor);
}

async function openOrAsk(doctorId: number, pid: string) {
	const patient = await patientByPid(pid);
	if (!patient) return { error: 'That patient could not be found.' as const };
	const result = await requestChartAccess(patient.id, doctorId);
	if (result !== 'granted') return { locked: patient.pid };
	return { patient };
}

export const actions = {
	start: async ({ request, locals }) => {
		const doctor = await doctorFrom(locals);
		if (!doctor) redirect(303, '/doctors/login');

		const data = await request.formData();
		const pid = String(data.get('pid') ?? '').trim();
		if (!pid) return fail(400, { message: 'Select a registered patient to start the consultation.' });

		const gate = await openOrAsk(doctor.id, pid);
		if ('error' in gate) return fail(404, { message: gate.error });
		if ('locked' in gate) redirect(303, `/doctor/access/${gate.locked}`);
		await draftConsult(gate.patient.id, doctor.id);
		redirect(303, `/doctor/patients/${gate.patient.pid}/consult`);
	},
	request: async ({ request, locals }) => {
		const doctor = await doctorFrom(locals);
		if (!doctor) redirect(303, '/doctors/login');
		const data = await request.formData();
		const pid = String(data.get('pid') ?? '').trim();
		if (!pid) return fail(400, { message: 'Select a registered patient.' });
		const gate = await openOrAsk(doctor.id, pid);
		if ('error' in gate) return fail(404, { message: gate.error });
		if ('locked' in gate) redirect(303, `/doctor/access/${gate.locked}`);
		await draftConsult(gate.patient.id, doctor.id);
		redirect(303, `/doctor/patients/${gate.patient.pid}/consult`);
	},
	register: async ({ request, locals }) => {
		const doctor = await doctorFrom(locals);
		if (!doctor) redirect(303, '/doctors/login');

		const data = await request.formData();
		const firstName = String(data.get('first_name') ?? '').trim();
		const lastName = String(data.get('last_name') ?? '').trim();
		const dob = String(data.get('dob') ?? '').trim();
		const sex = String(data.get('sex') ?? '').trim();
		const phone = String(data.get('phone') ?? '').trim();
		const nic = String(data.get('nic') ?? '').trim();
		const passport = String(data.get('passport') ?? '').trim();
		const entered = { offerNew: true, firstName, lastName, dob, sex, phone, nic, passport, name: `${firstName} ${lastName}`.trim() };

		if (!firstName || !lastName) return fail(400, { ...entered, message: 'Enter a first and last name.' });
		if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob)) || dob < '1900-01-01' || dob > liveDay())) {
			return fail(400, { ...entered, message: 'Enter a valid date of birth on or before today.' });
		}
		if (!sexes.includes(sex as (typeof sexes)[number])) {
			return fail(400, { ...entered, message: 'Choose Female or Male.' });
		}
		if (!phone || phone.length > 40 || !/^[+0-9()\-.\s]+$/.test(phone)) {
			return fail(400, { ...entered, message: 'Enter a phone number using digits, spaces, and + ( ) - .' });
		}
		const identity = /^[A-Za-z0-9][A-Za-z0-9\s-]{4,31}$/;
		if (!nic && !passport) {
			return fail(400, { ...entered, message: 'Enter a NIC or a passport number so later visits stay on one timeline.' });
		}
		if (nic && !identity.test(nic)) {
			return fail(400, { ...entered, message: 'Enter a NIC using letters and numbers.' });
		}
		if (passport && !identity.test(passport)) {
			return fail(400, { ...entered, message: 'Enter a passport number using letters and numbers.' });
		}

		let created;
		try {
			created = await createWalkInPatient(doctor.id, { firstName, lastName, dob, sex, phone, nic, passport });
		} catch (error) {
			const constraint = error && typeof error === 'object' && 'constraint_name' in error ? String(error.constraint_name) : '';
			if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
				const message = constraint.includes('passport')
					? 'A chart already uses that passport number.'
					: 'A chart already uses that NIC.';
				return fail(409, { ...entered, message });
			}
			throw error;
		}
		if ('error' in created) return fail(409, { ...entered, message: created.error });
		await draftConsult(created.patient.id, doctor.id);
		const notice = created.continued
			? 'This NIC or passport is already on an unsigned chart. This visit joins that timeline.'
			: '';
		redirect(303, `/doctor/patients/${created.patient.pid}/consult${notice ? `?notice=${encodeURIComponent(notice)}` : ''}`);
	}
};
