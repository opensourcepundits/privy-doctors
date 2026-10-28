import { physiciansFor, pendingChartRequests } from '#lib/server/clinic';
import { answerChartRequest } from '#lib/server/answers';

export async function load({ parent }) {
	const { patient } = await parent();
	const [physicians, requests] = await Promise.all([physiciansFor(patient.id), pendingChartRequests(patient.id)]);
	return { physicians, requests };
}

export const actions = {
	allow: async ({ request, locals }) => answerChartRequest(locals, request, true, '/patient/physicians'),
	deny: async ({ request, locals }) => answerChartRequest(locals, request, false, '/patient/physicians')
};
