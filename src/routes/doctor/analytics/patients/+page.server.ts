import { patientsForDoctor } from '#lib/server/clinic';

export async function load({ url, parent }) {
	const { doctor } = await parent();
	const q = url.searchParams.get('q') ?? '';
	const rows = await patientsForDoctor(doctor.id, q);
	return {
		q,
		patients: rows.map((patient) => ({ ...patient, record_token: null, user_id: null }))
	};
}
