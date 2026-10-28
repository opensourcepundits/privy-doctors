import { redirect } from '@sveltejs/kit';
import { encountersFor, imagingFor, labsFor, orderLab, prescriptionsFor, selfReportsFor, tasksForPatient } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, url, locals }) {
	const { doctor, patient } = await requireChart(locals, params.pid);
	const [encounters, prescriptions, imaging, labs, tasks, reports] = await Promise.all([
		encountersFor(patient.id),
		prescriptionsFor(patient.id),
		imagingFor(patient.id),
		labsFor(patient.id),
		tasksForPatient(patient.id),
		selfReportsFor(patient.id)
	]);
	return {
		patient,
		doctor,
		encounters,
		prescriptions,
		imaging,
		labs,
		tasks,
		reports,
		tab: url.searchParams.get('tab') ?? 'checkups'
	};
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
