import { fail, redirect } from '@sveltejs/kit';
import { authenticate, createSession, sessionCookie } from '#lib/server/auth';
import { doctorForUser } from '#lib/server/clinic';

const rejected = 'Those credentials are not recognized.';

export function load({ locals }) {
	if (locals.user?.role === 'doctor') redirect(303, '/doctor');
	if (locals.user?.role === 'patient') redirect(303, '/patient');
}

export const actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const user = await authenticate(email, password, 'doctor');
		if (!user) return fail(400, { email, message: rejected });
		const doctor = await doctorForUser(user.id);
		if (!doctor) return fail(400, { email, message: rejected });
		const sid = await createSession(user.id);
		cookies.set('sid', sid, sessionCookie(url));
		redirect(303, '/doctor');
	}
};
