import { doctorForUser, patientsForDoctor } from '#lib/server/clinic';

export function load({ url, locals }: { url: URL; locals: App.Locals }) {
	const q = url.searchParams.get('q') ?? '';
	return { q, patients: roster(locals, q) };
}

async function roster(locals: App.Locals, q: string) {
	if (!locals.user) return [];
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) return [];
	const rows = await patientsForDoctor(doctor.id, q);
	return rows.map((patient) => ({ ...patient, record_token: null, user_id: null }));
}
