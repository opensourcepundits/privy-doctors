import { redirect } from '@sveltejs/kit';
import { consultationsFor, encountersFor, imagingFor, labsFor, orderLab, prescriptionsFor, selfReportsFor, tasksForPatient } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ parent }) {
	const { patient } = await parent();
	const [encounters, prescriptions, imaging, labs, tasks, reports, consultations] = await Promise.all([
		encountersFor(patient.id),
		prescriptionsFor(patient.id),
		imagingFor(patient.id),
		labsFor(patient.id),
		tasksForPatient(patient.id),
		selfReportsFor(patient.id),
		consultationsFor(patient.id)
	]);
	return { encounters, prescriptions, imaging, labs, tasks, reports, consultations };
}

export const actions = {
	orderLab: async ({ request, params, locals }) => {
		const { doctor, patient } = await requireChart(locals, params.pid);
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const facility = String(data.get('facility') ?? '').trim();
		if (!name) return { message: 'Name the laboratory panel.' };
		const orderedBy = `${doctor.name}, ${doctor.credentials}`;
		await orderLab(patient.id, name, facility || 'Quest Diagnostics', orderedBy);
		redirect(303, `/doctor/patients/${params.pid}?tab=labs&notice=${encodeURIComponent('Laboratory order saved')}`);
	}
};
