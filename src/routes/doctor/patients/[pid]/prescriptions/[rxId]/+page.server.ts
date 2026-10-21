import { error } from '@sveltejs/kit';
import { patientByPid, prescriptionById, requestRefill } from '#lib/server/clinic';

export async function load({ params }) {
	const patient = await patientByPid(params.pid);
	if (!patient) error(404, 'Patient not found');
	const prescription = await prescriptionById(patient.id, Number(params.rxId));
	if (!prescription) error(404, 'Prescription not found');
	return { patient, prescription };
}

export const actions = {
	renew: async ({ params }) => {
		const patient = await patientByPid(params.pid);
		if (!patient) error(404, 'Patient not found');
		await requestRefill(patient.id, Number(params.rxId));
		return { sent: true };
	}
};
