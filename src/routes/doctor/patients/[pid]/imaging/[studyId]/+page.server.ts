import { error } from '@sveltejs/kit';
import { imagingById } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { patient } = await parent();
	const study = await imagingById(patient.id, Number(params.studyId));
	if (!study) error(404, 'Study not found');
	return { patient, study };
}
