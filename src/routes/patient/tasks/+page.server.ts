import { fail, redirect } from '@sveltejs/kit';
import { actingPatient, rescheduleOwnAppointment, saveTaskResult, taskOwned, tasksForPatient, taskVisits } from '#lib/server/clinic';
import { saveTaskPdf } from '#lib/server/uploads';

export function load({ locals }: { locals: App.Locals }) {
	return { tasks: tasksFor(locals), visits: visitsFor(locals) };
}

async function visitsFor(locals: App.Locals) {
	if (!locals.user) return [];
	const patient = await actingPatient(locals.user);
	if (!patient) return [];
	return taskVisits(patient.id);
}

async function tasksFor(locals: App.Locals) {
	if (!locals.user) return [];
	const patient = await actingPatient(locals.user);
	if (!patient) return [];
	return tasksForPatient(patient.id);
}

export const actions = {
	upload: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in required.' });
		const patient = await actingPatient(locals.user);
		if (!patient) return fail(401, { message: 'Sign in required.' });
		const data = await request.formData();
		const task = await taskOwned(Number(data.get('task')), patient.id);
		if (!task) return fail(404, { message: 'That task is not on your checklist.' });
		const file = data.get('result');
		if (!(file instanceof File) || file.size === 0) return fail(400, { message: 'Choose a PDF to upload.' });
		if (file.size > 8 * 1024 * 1024) return fail(400, { message: 'The PDF must be 8 MB or smaller.' });
		const bytes = Buffer.from(await file.arrayBuffer());
		if (bytes.subarray(0, 5).toString('utf8') !== '%PDF-') return fail(400, { message: 'Upload a PDF file.' });
		const stored = await saveTaskPdf(task.id, bytes);
		const name = file.name.replace(/[/\\]/g, '').slice(0, 120) || 'result.pdf';
		await saveTaskResult(task.id, patient.id, name, stored);
		return { uploaded: task.id };
	},
	reschedule: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in required.' });
		const patient = await actingPatient(locals.user);
		if (!patient || locals.user.role !== 'patient') return fail(401, { message: 'Sign in required.' });
		const data = await request.formData();
		const result = await rescheduleOwnAppointment(patient.id, Number(data.get('id')), String(data.get('starts_at') ?? ''));
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, '/patient/tasks?notice=Appointment rescheduled');
	}
};
