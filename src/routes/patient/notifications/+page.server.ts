import { notificationsFor, pendingChartRequests } from '#lib/server/clinic';
import { answerChartRequest } from '#lib/server/answers';

export async function load({ parent }) {
	const { user, patient } = await parent();
	const [notifications, requests] = await Promise.all([notificationsFor(user.id), pendingChartRequests(patient.id)]);
	return { notifications, requests };
}

export const actions = {
	allow: async ({ request, locals }) => answerChartRequest(locals, request, true, '/patient/notifications'),
	deny: async ({ request, locals }) => answerChartRequest(locals, request, false, '/patient/notifications')
};
