import { doctorById } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const clinician = await doctorById(patient.primary_doctor_id);
	return { clinician };
}
