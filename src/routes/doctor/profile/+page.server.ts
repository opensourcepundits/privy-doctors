import { fail, redirect } from '@sveltejs/kit';
import { doctorForUser, doctorSchedule, removeAvailability, setDayAvailability, updateDoctorProfile } from '#lib/server/clinic';

async function requireDoctor(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) redirect(303, '/login');
	return doctor;
}

export async function load({ parent }) {
	const { doctor } = await parent();
	const hours = await doctorSchedule(doctor.id);
	return { hours };
}

export const actions = {
	save: async ({ request, locals }) => {
		const doctor = await requireDoctor(locals);
		const data = await request.formData();
		const input = {
			name: String(data.get('name') ?? ''),
			credentials: String(data.get('credentials') ?? ''),
			specialty: String(data.get('specialty') ?? ''),
			practice: String(data.get('practice') ?? ''),
			location: String(data.get('location') ?? ''),
			phone: String(data.get('phone') ?? '')
		};
		const result = await updateDoctorProfile(doctor.id, doctor.user_id, input);
		if ('error' in result) return fail(400, { message: result.error, details: true, ...input });
		redirect(303, '/doctor/profile?notice=Profile saved');
	},
	add: async ({ request, locals }) => {
		const doctor = await requireDoctor(locals);
		const data = await request.formData();
		const starts = data.getAll('start').map(String);
		const ends = data.getAll('end').map(String);
		const count = Math.max(starts.length, ends.length);
		const ranges = Array.from({ length: count }, (_, index) => ({
			start: starts[index] ?? '',
			end: ends[index] ?? ''
		}));
		const result = await setDayAvailability(doctor.id, {
			kind: String(data.get('kind') ?? ''),
			weekday: Number(data.get('weekday')),
			ranges
		});
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, '/doctor/profile?notice=Hours saved');
	},
	remove: async ({ request, locals }) => {
		const doctor = await requireDoctor(locals);
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!Number.isInteger(id)) return fail(400, { message: 'That range could not be removed.' });
		await removeAvailability(doctor.id, id);
		redirect(303, '/doctor/profile?notice=Hours removed');
	}
};
