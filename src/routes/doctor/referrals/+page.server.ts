import { fail, redirect } from '@sveltejs/kit';
import { doctorForUser, startConsultForReferral } from '#lib/server/clinic';

export const actions = {
	start: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
		const doctor = await doctorForUser(locals.user.id);
		if (!doctor) redirect(303, '/login');
		const data = await request.formData();
		const result = await startConsultForReferral(Number(data.get('id')), doctor.id);
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, `/doctor/patients/${result.pid}/consult`);
	}
};
