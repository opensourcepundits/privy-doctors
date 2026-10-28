import { error } from '@sveltejs/kit';
import { imagingById } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, locals }) {
	const { patient } = await requireChart(locals, params.pid);
	const study = await imagingById(patient.id, Number(params.studyId));
	if (!study) error(404, 'Study not found');
	return { patient, study };
}
