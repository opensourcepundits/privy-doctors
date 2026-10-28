import { error } from '@sveltejs/kit';
import { acknowledgeLab, labById } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, parent }) {
	const { patient } = await parent();
	const lab = await labById(patient.id, Number(params.labId));
	if (!lab) error(404, 'Lab not found');
	return { patient, lab };
}

export const actions = {
	acknowledge: async ({ params, locals }) => {
		const { patient } = await requireChart(locals, params.pid);
		await acknowledgeLab(Number(params.labId), patient.id);
		return { acknowledged: true };
	}
};
