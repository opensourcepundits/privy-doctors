import { error } from '@sveltejs/kit';

export async function load({ parent, url }) {
	const { patient } = await parent();
	const year = url.searchParams.get('year') ?? '';
	const name = url.searchParams.get('name') ?? '';
	const item = (patient.surgeries ?? []).find((surgery) => surgery.year === year && surgery.name === name);
	if (!item) error(404, 'Procedure not found');
	return { item };
}
