import { careOrdersFor, latestVital, prescriptionsFor, upcomingAppointment } from '#lib/server/clinic';

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
