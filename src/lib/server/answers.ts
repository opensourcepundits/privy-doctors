import { fail, redirect } from '@sveltejs/kit';
import { decideChartAccess, patientForUser } from './clinic';

export async function answerChartRequest(locals: App.Locals, request: Request, allow: boolean, back: string) {
	if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
	const patient = await patientForUser(locals.user.id);
	if (!patient) redirect(303, '/login');
	const data = await request.formData();
	const id = Number(data.get('id'));
	if (!Number.isInteger(id) || id < 1) return fail(400, { message: 'That request was not found.' });
	const saved = await decideChartAccess(patient.id, id, allow);
	if (!saved) return fail(404, { message: 'That request was not found.' });
	const notice = allow ? 'Access allowed' : 'Access denied';
	redirect(303, `${back}?notice=${encodeURIComponent(notice)}`);
}
