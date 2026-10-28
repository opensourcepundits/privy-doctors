import { careOrdersFor, latestVital, pendingChartRequests, prescriptionsFor, tasksForPatient, upcomingAppointment } from '#lib/server/clinic';
import { answerChartRequest } from '#lib/server/answers';

export async function load({ parent }) {
	const { patient } = await parent();
	const [appointment, prescriptions, orders, vital, tasks, requests] = await Promise.all([
		upcomingAppointment(patient.id),
		prescriptionsFor(patient.id),
		careOrdersFor(patient.id),
		latestVital(patient.id),
		tasksForPatient(patient.id),
		pendingChartRequests(patient.id)
	]);
	const active = prescriptions.filter((item) => item.status === 'active');
	return { appointment, active, orders, vital, tasks, requests };
}

export const actions = {
	allow: async ({ request, locals }) => answerChartRequest(locals, request, true, '/patient'),
	deny: async ({ request, locals }) => answerChartRequest(locals, request, false, '/patient')
};
