import { fail, redirect } from '@sveltejs/kit';
import { createSession, userByEmail } from '#lib/server/auth';
import { doctorForUser } from '#lib/server/clinic';
import { verifyPassword } from '#lib/server/password';

export function load({ locals }) {
	if (locals.user?.role === 'doctor') redirect(303, '/doctor');
	if (locals.user?.role === 'patient') redirect(303, '/patient');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const user = await userByEmail(email);
		if (user?.role === 'patient') {
			return fail(400, { email, message: 'Patients sign in on the patient page.' });
		}
		if (!user || user.role !== 'doctor' || !verifyPassword(password, user.password_hash)) {
			return fail(400, { email, message: 'Those credentials are not recognized.' });
		}
		const doctor = await doctorForUser(user.id);
		if (!doctor) {
			return fail(400, { email, message: 'That account is not on the clinic roster.' });
		}
		const sid = await createSession(user.id);
		cookies.set('sid', sid, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 14 });
		redirect(303, '/doctor');
	}
};
