import { fail, redirect } from '@sveltejs/kit';
import { actingPatient, bookAppointment, bookingBoard, patientAppointments } from '#lib/server/clinic';

export function load({ locals }: { locals: App.Locals }) {
	return { board: boardFor(locals) };
}

async function boardFor(locals: App.Locals) {
	if (!locals.user) return { doctors: [], today: [], upcoming: [] };
	const patient = await actingPatient(locals.user);
	if (!patient) return { doctors: [], today: [], upcoming: [] };
	const [doctors, visits] = await Promise.all([bookingBoard(), patientAppointments(patient.id)]);
	return { doctors, today: visits.today, upcoming: visits.upcoming };
}

export const actions = {
	book: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const patient = await actingPatient(locals.user);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const result = await bookAppointment(patient.id, {
			doctorId: Number(data.get('doctor_id')),
			kind: String(data.get('kind') ?? ''),
			startsAt: String(data.get('starts_at') ?? ''),
			reason: String(data.get('reason') ?? '')
		});
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, '/patient?notice=Appointment booked');
	}
};
