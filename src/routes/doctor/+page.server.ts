import { todayAppointments, upcomingForDoctor } from '#lib/server/clinic';

export async function load({ parent }) {
	const { doctor } = await parent();
	const [appointments, upcoming] = await Promise.all([
		todayAppointments(doctor.id),
		upcomingForDoctor(doctor.id)
	]);
	return { appointments, upcoming };
}
