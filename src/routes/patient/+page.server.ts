import { actingPatient, careOrdersFor, latestVital, patientAppointments, pendingChartRequests, prescriptionsFor, tasksForPatient, taskVisits } from '#lib/server/clinic';
import { answerChartRequest } from '#lib/server/answers';

export function load({ locals }: { locals: App.Locals }) {
	return { home: homeFor(locals) };
}

async function homeFor(locals: App.Locals) {
	const empty = { today: [], upcoming: [], active: [], orders: [], vital: null, tasks: [], requests: [], visitTasks: [] };
	if (!locals.user) return empty;
	const patient = await actingPatient(locals.user);
	if (!patient) return empty;
	const [visits, prescriptions, orders, vital, tasks, requests, visitTasks] = await Promise.all([
		patientAppointments(patient.id),
		prescriptionsFor(patient.id),
		careOrdersFor(patient.id),
		latestVital(patient.id),
		tasksForPatient(patient.id),
		pendingChartRequests(patient.id),
		taskVisits(patient.id)
	]);
	const active = prescriptions.filter((item) => item.status === 'active');
	return { today: visits.today, upcoming: visits.upcoming, active, orders, vital, tasks, requests, visitTasks };
}

export const actions = {
	allow: async ({ request, locals }) => answerChartRequest(locals, request, true, '/patient'),
	deny: async ({ request, locals }) => answerChartRequest(locals, request, false, '/patient')
};
