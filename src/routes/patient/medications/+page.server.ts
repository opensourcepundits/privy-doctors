import { error, redirect } from '@sveltejs/kit';
import { actingPatient, addOtc, doseLogsFor, prescriptionsFor, takeDose } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const [prescriptions, doses] = await Promise.all([prescriptionsFor(patient.id), doseLogsFor(patient.id)]);
	return { prescriptions, doses };
}

export const actions = {
	take: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Sign in required');
		const patient = await actingPatient(locals.user);
		if (!patient) error(404, 'Patient not found');
		const data = await request.formData();
		await takeDose(Number(data.get('id')), patient.id);
		redirect(303, '/patient/medications?notice=Dose marked as taken');
	},
	otc: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Sign in required');
		const patient = await actingPatient(locals.user);
		if (!patient) error(404, 'Patient not found');
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		if (!name) return { message: 'Name the supplement.' };
		await addOtc(patient.id, name, detail);
		redirect(303, '/patient/medications?notice=Supplement saved to your record');
	}
};
