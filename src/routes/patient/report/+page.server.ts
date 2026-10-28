import { fail, redirect } from '@sveltejs/kit';
import { isoDate } from '#lib/format';
import { readSelfReport } from '#lib/report-form';
import { addSelfReport, patientForUser } from '#lib/server/clinic';

export function load() {
	return { today: isoDate(new Date()) };
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const parsed = readSelfReport(await request.formData());
		if (!parsed.value) return fail(400, parsed);
		await addSelfReport(patient.id, parsed.value);
		redirect(303, `/patient/history?notice=${encodeURIComponent('Self report filed')}`);
	}
};
