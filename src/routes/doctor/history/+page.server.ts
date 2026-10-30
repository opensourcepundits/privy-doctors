import { consultHistory } from '#lib/server/clinic';

export async function load({ parent }) {
	const { doctor } = await parent();
	return { history: await consultHistory(doctor.id) };
}
