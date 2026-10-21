import { error, redirect } from '@sveltejs/kit';
import { actingPatient, careOrdersFor, confirmAppointment, latestVital, prescriptionsFor, upcomingAppointment } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const [appointment, prescriptions, orders, vital] = await Promise.all([
		upcomingAppointment(patient.id),
		prescriptionsFor(patient.id),
		careOrdersFor(patient.id),
		latestVital(patient.id)
	]);
	const active = prescriptions.filter((item) => item.status === 'active');
	return { appointment, active, orders, vital };
}

export const actions = {
	confirm: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Sign in required');
		const patient = await actingPatient(locals.user);
		if (!patient) error(404, 'Patient not found');
		const data = await request.formData();
		await confirmAppointment(Number(data.get('id')), patient.id);
		redirect(303, '/patient?notice=You are checked in for this visit');
	}
};
