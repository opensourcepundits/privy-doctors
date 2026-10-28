import { error } from '@sveltejs/kit';
import { prescriptionById, requestRefill } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, locals }) {
	const { patient } = await requireChart(locals, params.pid);
	const prescription = await prescriptionById(patient.id, Number(params.rxId));
	if (!prescription) error(404, 'Prescription not found');
	return { patient, prescription };
}

export const actions = {
	renew: async ({ params, locals }) => {
		const { patient } = await requireChart(locals, params.pid);
		await requestRefill(patient.id, Number(params.rxId));
		return { sent: true };
	}
};
