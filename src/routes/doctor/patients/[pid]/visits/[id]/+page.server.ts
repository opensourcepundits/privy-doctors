import { error } from '@sveltejs/kit';
import { visitByEncounter } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { doctor, patient } = await parent();
	const record = await visitByEncounter(patient.id, Number(params.id), doctor.id, patient.pid);
	if (!record) error(404, 'Consultation not found');
	return { patient, record };
}
