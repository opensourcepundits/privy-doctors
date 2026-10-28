import { notificationsFor, todayAppointments, upcomingForDoctor } from '#lib/server/clinic';

export async function load({ parent }) {
	const { doctor } = await parent();
	const [appointments, upcoming, notifications] = await Promise.all([
		todayAppointments(doctor.id),
		upcomingForDoctor(doctor.id),
		doctor.user_id ? notificationsFor(doctor.user_id) : []
	]);
	return { appointments, upcoming, notifications };
}
