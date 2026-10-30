import { error, redirect } from '@sveltejs/kit';
import { consultForEncounterEdit } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, locals }) {
	const { doctor, patient } = await requireChart(locals, params.pid);
	const result = await consultForEncounterEdit(patient.id, Number(params.id), doctor.id);
	if ('error' in result) error(result.error === 'Consultation not found.' ? 404 : 403, result.error);
	redirect(303, `/doctor/patients/${patient.pid}/consults/${result.consultId}/prescription`);
}
