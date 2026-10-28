import { error } from '@sveltejs/kit';
import { clinicianById } from '#lib/server/clinic';

export async function load({ params }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'Clinician not found');
	const profile = await clinicianById(id);
	if (!profile) error(404, 'Clinician not found');
	return { profile };
}
