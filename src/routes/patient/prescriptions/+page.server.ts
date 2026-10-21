import { prescriptionsFor } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	return { prescriptions: await prescriptionsFor(patient.id) };
}
