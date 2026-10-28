import { redirect } from '@sveltejs/kit';
import { clinicianDirectory, doctorForUser, incomingReferrals, notificationsFor, openConsultsForDoctor } from '#lib/server/clinic';

export async function load({ locals, url }) {
	if (!locals.user) redirect(303, '/login');
	if (locals.user.role !== 'doctor') redirect(303, '/patient');
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) redirect(303, '/login');
	const [directory, incoming, openConsults, notifications] = await Promise.all([
		clinicianDirectory(),
		incomingReferrals(doctor.id),
		openConsultsForDoctor(doctor.id),
		doctor.user_id ? notificationsFor(doctor.user_id) : []
	]);
	return {
		user: locals.user,
		doctor,
		directory,
		incoming,
		openConsults,
		notifications,
		path: url.pathname,
		query: url.search,
		notice: url.searchParams.get('notice')
	};
}
