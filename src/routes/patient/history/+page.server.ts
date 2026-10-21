import { encountersFor, imagingFor, labsFor } from '#lib/server/clinic';

export async function load({ parent, url }) {
	const { patient } = await parent();
	const [encounters, imaging, labs] = await Promise.all([
		encountersFor(patient.id),
		imagingFor(patient.id),
		labsFor(patient.id)
	]);
	return { encounters, imaging, labs, view: url.searchParams.get('view') ?? 'all' };
}
