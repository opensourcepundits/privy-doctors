import { error } from '@sveltejs/kit';
import { imagingById, patientByPid } from '#lib/server/clinic';

export async function load({ params }) {
	const patient = await patientByPid(params.pid);
	if (!patient) error(404, 'Patient not found');
	const study = await imagingById(patient.id, Number(params.studyId));
	if (!study) error(404, 'Study not found');
	return { patient, study };
}
