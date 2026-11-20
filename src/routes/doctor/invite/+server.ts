import { json } from '@sveltejs/kit';
import { doctorForUser, issueColleagueInvite } from '#lib/server/clinic';

export async function POST({ locals, request, url }) {
	if (!locals.user || locals.user.role !== 'doctor') {
		return json({ message: 'Sign in as a doctor.' }, { status: 401 });
	}
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) return json({ message: 'That account is not on the clinic roster.' }, { status: 403 });
	const data = await request.formData();
	const token = await issueColleagueInvite(Number(doctor.id), data.get('rotate') === '1');
	return json({ link: `${url.origin}/doctors/join/${token}` });
}
