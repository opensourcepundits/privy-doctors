import { error, redirect } from '@sveltejs/kit';
import { actingPatient, labsFor, logVital, vitalsFor } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const [vitals, labs] = await Promise.all([vitalsFor(patient.id), labsFor(patient.id)]);
	return { vitals, labs };
}

export const actions = {
	log: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Sign in required');
		const patient = await actingPatient(locals.user);
		if (!patient) error(404, 'Patient not found');
		const data = await request.formData();
		const systolic = Number(data.get('systolic'));
		const diastolic = Number(data.get('diastolic'));
		const heartRate = Number(data.get('heartRate'));
		const source = String(data.get('source') ?? 'Omron home cuff');
		if (!systolic || !diastolic || !heartRate) return { message: 'Enter blood pressure and heart rate.' };
		await logVital(patient.id, systolic, diastolic, heartRate, source);
		redirect(303, '/patient/vitals?notice=Reading saved and transmitted');
	}
};
