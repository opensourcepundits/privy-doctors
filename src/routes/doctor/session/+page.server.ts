import { redirect } from '@sveltejs/kit';
import { cancelConsult, doctorForUser } from '#lib/server/clinic';

export function load() {
	redirect(303, '/doctor');
}

export const actions = {
	cancel: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
		const doctor = await doctorForUser(locals.user.id);
		if (!doctor) redirect(303, '/login');
		const data = await request.formData();
		const id = Number(data.get('id'));
		const raw = String(data.get('return') ?? '');
		const back = raw.startsWith('/doctor') && !raw.includes('/consult') ? raw : '';
		const result = await cancelConsult(id, doctor.id);
		if ('error' in result) {
			redirect(303, `${back || '/doctor'}?notice=${encodeURIComponent(result.error)}`);
		}
		const dest = back || `/doctor/patients/${result.pid}`;
		redirect(303, `${dest}?notice=${encodeURIComponent('Consultation cancelled')}`);
	}
};
