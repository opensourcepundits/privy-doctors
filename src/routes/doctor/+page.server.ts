import { doctorForUser, todayAppointments, upcomingForDoctor } from '#lib/server/clinic';

export function load({ locals }: { locals: App.Locals }) {
	return { schedule: clinicSchedule(locals) };
}

async function clinicSchedule(locals: App.Locals) {
	if (!locals.user) return { appointments: [], upcoming: [] };
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) return { appointments: [], upcoming: [] };
	const [appointments, upcoming] = await Promise.all([
		todayAppointments(doctor.id),
		upcomingForDoctor(doctor.id)
	]);
	return { appointments, upcoming };
}
