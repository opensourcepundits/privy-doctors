import { error } from '@sveltejs/kit';
import { visitByEncounter } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, locals }) {
	const { doctor, patient } = await requireChart(locals, params.pid);
	const record = await visitByEncounter(patient.id, Number(params.id), doctor.id, patient.pid);
	if (!record) error(404, 'Consultation not found');
	return { patient, record };
}
