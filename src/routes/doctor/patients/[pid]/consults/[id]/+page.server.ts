import { error, redirect } from '@sveltejs/kit';
import { deleteConsult, visitByConsult } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, parent }) {
	const { doctor, patient } = await parent();
	const record = await visitByConsult(patient.id, Number(params.id), doctor.id, patient.pid);
	if (!record) error(404, 'Consultation not found');
	return { patient, record };
}

export const actions = {
	delete: async ({ params, locals }) => {
		const { doctor, patient } = await requireChart(locals, params.pid);
		const result = await deleteConsult(Number(params.id), doctor.id, patient.id);
		if ('error' in result) {
			redirect(303, `/doctor/patients/${patient.pid}/consults/${params.id}?notice=${encodeURIComponent(result.error)}`);
		}
		redirect(303, `/doctor/patients/${patient.pid}?tab=consults&notice=${encodeURIComponent('Consultation deleted')}`);
	}
};
