import { fail, redirect } from '@sveltejs/kit';
import { createWalkInPatient, doctorForUser, draftConsult, patientByPid, requestChartAccess, searchPatients, type PatientRow } from '#lib/server/clinic';

const sexes = ['Female', 'Male'] as const;

function doctorFrom(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
	return doctorForUser(locals.user.id);
}

function forDoctor(patient: PatientRow & { access: string }) {
	const hasPortal = Boolean(patient.user_id);
	const shared = { ...patient, record_token: null, user_id: null, has_portal: hasPortal };
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

export async function load({ url, parent }) {
	const { doctor } = await parent();
	const q = url.searchParams.get('q') ?? '';
	const intent = url.searchParams.get('intent');
	const rows = await searchPatients(doctor.id, intent === 'consult' ? '' : q);
	return { q, intent, patients: rows.map(forDoctor) };
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
		if (!doctor) redirect(303, '/login');

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
		if (!doctor) redirect(303, '/login');
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
		if (!doctor) redirect(303, '/login');

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
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) {
			return fail(400, { ...entered, message: 'Enter a valid date of birth.' });
		}
		if (!sexes.includes(sex as (typeof sexes)[number])) {
			return fail(400, { ...entered, message: 'Choose Female or Male.' });
		}
		const identity = /^[A-Za-z0-9][A-Za-z0-9\s-]{4,31}$/;
		if (!nic && !passport) {
			return fail(400, { ...entered, message: 'Enter a NIC or a passport number.' });
		}
		if (nic && !identity.test(nic)) {
			return fail(400, { ...entered, message: 'Enter a NIC using letters and numbers.' });
		}
		if (passport && !identity.test(passport)) {
			return fail(400, { ...entered, message: 'Enter a passport number using letters and numbers.' });
		}

		let patient;
		try {
			patient = await createWalkInPatient(doctor.id, { firstName, lastName, dob, sex, phone, nic, passport });
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
		await draftConsult(patient.id, doctor.id);
		redirect(303, `/doctor/patients/${patient.pid}/consult`);
	}
};
