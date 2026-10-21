import { todayAppointments } from '#lib/server/clinic';

export async function load({ parent }) {
	const { doctor } = await parent();
	const appointments = await todayAppointments(doctor.id);
	return { appointments };
}
