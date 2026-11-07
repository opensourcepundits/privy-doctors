import { certificatesForPatient } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	return { certificates: await certificatesForPatient(patient.id) };
}
