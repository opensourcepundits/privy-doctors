import { redirect } from '@sveltejs/kit';
import { patientForUser, portalPatient } from '#lib/server/clinic';

export async function load({ locals, url }) {
	if (!locals.user) redirect(303, '/login');
	const preview = locals.user.role === 'doctor';
	const patient = preview ? await portalPatient() : await patientForUser(locals.user.id);
	if (!patient) redirect(303, '/login');
	return {
		user: locals.user,
		patient,
		preview,
		path: url.pathname,
		query: url.search,
		notice: url.searchParams.get('notice')
	};
}
