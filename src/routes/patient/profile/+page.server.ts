import { fail, redirect } from '@sveltejs/kit';
import { accountEmail, actingPatient, doctorById, updatePatientField } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const [clinician, email] = await Promise.all([doctorById(patient.primary_doctor_id), accountEmail(patient.user_id)]);
	return { clinician, email };
}

export const actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const patient = await actingPatient(locals.user);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const field = String(data.get('field') ?? '');
		const value = String(data.get('value') ?? '');
		if (data.get('confirmed') !== 'yes') {
			return fail(400, { message: 'Confirm this change before it is saved.', field, value });
		}
		const result = await updatePatientField(patient.id, field, value);
		if ('error' in result) return fail(400, { message: result.error, field, value });
		redirect(303, '/patient/profile?notice=Profile updated');
	}
};
