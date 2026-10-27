import { fail, redirect } from '@sveltejs/kit';
import { createWalkInPatient, doctorForUser, draftConsult, patientByPid, searchPatients } from '#lib/server/clinic';

const sexes = ['Female', 'Male'] as const;

function doctorFrom(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
	return doctorForUser(locals.user.id);
}

function splitName(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	return {
		firstName: parts[0] ?? '',
		lastName: parts.slice(1).join(' ')
	};
}

export async function load({ url }) {
	const q = url.searchParams.get('q') ?? '';
	const intent = url.searchParams.get('intent');
	const patients = intent === 'consult' ? [] : await searchPatients(q);
	return { q, intent, patients };
}

export const actions = {
	start: async ({ request, locals }) => {
		const doctor = await doctorFrom(locals);
		if (!doctor) redirect(303, '/login');

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const pid = String(data.get('pid') ?? '').trim();

		if (pid) {
			const patient = await patientByPid(pid);
			if (!patient) return fail(404, { name, message: 'That patient could not be found.' });
			await draftConsult(patient.id, doctor.id);
			redirect(303, `/doctor/patients/${patient.pid}/consult`);
		}

		if (!name) return fail(400, { message: 'Enter the patient name to start the consultation.' });

		const matches = await searchPatients(name);
		if (matches.length === 0) {
			return fail(404, {
				name,
				offerNew: true,
				...splitName(name),
				message: 'No chart matches that name. Register them without a portal account, then start.'
			});
		}
		if (matches.length > 1) {
			return {
				name,
				message: 'Several patients match that name. Choose who is here.',
				matches: matches.map((patient) => ({
					pid: patient.pid,
					first_name: patient.first_name,
					last_name: patient.last_name,
					dob: patient.dob,
					sex: patient.sex,
					conditions: patient.conditions ?? [],
					concierge_note: patient.concierge_note
				}))
			};
		}

		await draftConsult(matches[0].id, doctor.id);
		redirect(303, `/doctor/patients/${matches[0].pid}/consult`);
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
