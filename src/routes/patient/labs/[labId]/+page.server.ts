import { error } from '@sveltejs/kit';
import { labById } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { patient } = await parent();
	const lab = await labById(patient.id, Number(params.labId));
	if (!lab) error(404, 'Lab not found');
	return { lab };
}
