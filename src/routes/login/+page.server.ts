import { fail, redirect } from '@sveltejs/kit';
import { createSession, userByEmail } from '#lib/server/auth';
import { verifyPassword } from '#lib/server/password';

export function load({ locals }) {
	if (locals.user?.role === 'patient') redirect(303, '/patient');
	if (locals.user?.role === 'doctor') redirect(303, '/doctor');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const user = await userByEmail(email);
		if (user?.role === 'doctor') {
			return fail(400, { email, message: 'Doctors sign in on the doctor page.' });
		}
		if (!user || user.role !== 'patient' || !verifyPassword(password, user.password_hash)) {
			return fail(400, { email, message: 'Those credentials are not recognized.' });
		}
		const sid = await createSession(user.id);
		cookies.set('sid', sid, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 14 });
		redirect(303, '/patient');
	}
};
