import { encountersFor, imagingFor, labsFor, selfReportsFor } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const [encounters, imaging, labs, reports] = await Promise.all([
		encountersFor(patient.id),
		imagingFor(patient.id),
		labsFor(patient.id),
		selfReportsFor(patient.id)
	]);
	return { encounters, imaging, labs, reports };
}
