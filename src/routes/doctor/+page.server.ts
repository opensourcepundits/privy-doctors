import { fail, redirect } from '@sveltejs/kit';
import { doctorForUser, rescheduleSlots, respondToAppointment, todayAppointments, upcomingForDoctor } from '#lib/server/clinic';

export function load({ locals }: { locals: App.Locals }) {
	return { schedule: clinicSchedule(locals) };
}

async function clinicSchedule(locals: App.Locals) {
	if (!locals.user) return { appointments: [], upcoming: [], slots: [] };
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) return { appointments: [], upcoming: [], slots: [] };
	const [appointments, upcoming, slots] = await Promise.all([
		todayAppointments(doctor.id),
		upcomingForDoctor(doctor.id),
		rescheduleSlots(doctor.id)
	]);
	return { appointments, upcoming, slots };
}

async function reply(request: Request, locals: App.Locals, action: 'accept' | 'decline' | 'reschedule') {
	if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) redirect(303, '/login');
	const data = await request.formData();
	const result = await respondToAppointment(doctor.id, Number(data.get('id')), action, {
		note: String(data.get('note') ?? ''),
		startsAt: String(data.get('starts_at') ?? '')
	});
	if ('error' in result) return fail(400, { message: result.error });
	const notice = action === 'accept' ? 'Appointment accepted' : action === 'decline' ? 'Appointment declined' : 'Appointment rescheduled';
	redirect(303, `/doctor?notice=${encodeURIComponent(notice)}`);
}

export const actions = {
	accept: ({ request, locals }: { request: Request; locals: App.Locals }) => reply(request, locals, 'accept'),
	decline: ({ request, locals }: { request: Request; locals: App.Locals }) => reply(request, locals, 'decline'),
	reschedule: ({ request, locals }: { request: Request; locals: App.Locals }) => reply(request, locals, 'reschedule')
};
