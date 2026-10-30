import { error } from '@sveltejs/kit';
import { selfReportById } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { patient } = await parent();
	const report = await selfReportById(patient.id, Number(params.id));
	if (!report) error(404, 'Self report not found');
	return { patient, report };
}
