import { error } from '@sveltejs/kit';
import { acknowledgeLab, labById, patientByPid } from '#lib/server/clinic';

export async function load({ params }) {
	const patient = await patientByPid(params.pid);
	if (!patient) error(404, 'Patient not found');
	const lab = await labById(patient.id, Number(params.labId));
	if (!lab) error(404, 'Lab not found');
	return { patient, lab };
}

export const actions = {
	acknowledge: async ({ params }) => {
		const patient = await patientByPid(params.pid);
		if (!patient) error(404, 'Patient not found');
		await acknowledgeLab(Number(params.labId), patient.id);
		return { acknowledged: true };
	}
};
