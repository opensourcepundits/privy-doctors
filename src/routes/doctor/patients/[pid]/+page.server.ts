import { error, redirect } from '@sveltejs/kit';
import { encountersFor, imagingFor, labsFor, orderLab, patientByPid, prescriptionsFor } from '#lib/server/clinic';

export async function load({ params, url, parent }) {
	const patient = await patientByPid(params.pid);
	if (!patient) error(404, 'Patient not found');
	const { doctor } = await parent();
	const [encounters, prescriptions, imaging, labs] = await Promise.all([
		encountersFor(patient.id),
		prescriptionsFor(patient.id),
		imagingFor(patient.id),
		labsFor(patient.id)
	]);
	return {
		patient,
		doctor,
		encounters,
		prescriptions,
		imaging,
		labs,
		tab: url.searchParams.get('tab') ?? 'checkups'
	};
}

export const actions = {
	orderLab: async ({ request, params }) => {
		const patient = await patientByPid(params.pid);
		if (!patient) error(404, 'Patient not found');
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const facility = String(data.get('facility') ?? '').trim();
		if (!name) return { message: 'Name the laboratory panel.' };
		await orderLab(patient.id, name, facility || 'Quest Diagnostics', 'Dr. Sarah Jensen, MD');
		redirect(303, `/doctor/patients/${params.pid}?tab=labs&notice=Laboratory order saved`);
	}
};
