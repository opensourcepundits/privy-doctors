import { fail, redirect } from '@sveltejs/kit';
import { patientForUser, physiciansFor, pendingChartRequests, setRecordAccess } from '#lib/server/clinic';
import { answerChartRequest } from '#lib/server/answers';

export async function load({ parent }) {
	const { patient } = await parent();
	const [physicians, requests] = await Promise.all([physiciansFor(patient.id), pendingChartRequests(patient.id)]);
	return { physicians, requests };
}

export const actions = {
	allow: async ({ request, locals }) => answerChartRequest(locals, request, true, '/patient/physicians'),
	deny: async ({ request, locals }) => answerChartRequest(locals, request, false, '/patient/physicians'),
	access: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const allow = String(data.get('allow') ?? '') === 'yes';
		const result = await setRecordAccess(patient.id, Number(data.get('doctor_id')), allow);
		if ('error' in result) return fail(400, { message: result.error });
		return { doctorId: Number(data.get('doctor_id')), allow, name: result.name };
	}
};
