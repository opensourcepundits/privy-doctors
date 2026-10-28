import { actingPatient, careOrdersFor, latestVital, pendingChartRequests, prescriptionsFor, tasksForPatient, upcomingAppointment } from '#lib/server/clinic';
import { answerChartRequest } from '#lib/server/answers';

export function load({ locals }: { locals: App.Locals }) {
	return { home: homeFor(locals) };
}

async function homeFor(locals: App.Locals) {
	const empty = { appointment: null, active: [], orders: [], vital: null, tasks: [], requests: [] };
	if (!locals.user) return empty;
	const patient = await actingPatient(locals.user);
	if (!patient) return empty;
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
