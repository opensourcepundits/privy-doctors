import { redirect } from '@sveltejs/kit';
import { clinicianDirectory, notificationsFor, patientForUser, portalPatient } from '#lib/server/clinic';

export async function load({ locals, url }) {
	if (!locals.user) redirect(303, '/login');
	const preview = locals.user.role === 'doctor';
	const patient = preview ? await portalPatient() : await patientForUser(locals.user.id);
	if (!patient) redirect(303, '/login');
	const [directory, notifications] = await Promise.all([
		clinicianDirectory(),
		patient.user_id ? notificationsFor(patient.user_id) : Promise.resolve([])
	]);
	return {
		user: locals.user,
		patient: { ...patient, record_token: null },
		preview,
		directory,
		notifications,
		path: url.pathname,
		query: url.search,
		notice: url.searchParams.get('notice')
	};
}
