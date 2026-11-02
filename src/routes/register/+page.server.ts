import { fail, redirect } from '@sveltejs/kit';
import { createSession } from '#lib/server/auth';
import { registerPatient } from '#lib/server/clinic';
import { hashPassword } from '#lib/server/password';

const sexes = ['Female', 'Male'] as const;

export function load({ locals }) {
	if (locals.user?.role === 'patient') redirect(303, '/patient');
	if (locals.user?.role === 'doctor') redirect(303, '/doctor');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const firstName = String(data.get('firstName') ?? '').trim();
		const lastName = String(data.get('lastName') ?? '').trim();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const sex = String(data.get('sex') ?? '').trim();
		const dob = String(data.get('dob') ?? '').trim();
		const phone = String(data.get('phone') ?? '').trim();
		const entered = { firstName, lastName, email, sex, dob, phone };
		if (!firstName || !lastName) return fail(400, { ...entered, message: 'Enter your name.' });
		if (!email.includes('@')) return fail(400, { ...entered, message: 'Enter a valid email.' });
		if (password.length < 8) return fail(400, { ...entered, message: 'Use a password of at least 8 characters.' });
		if (!sexes.includes(sex as (typeof sexes)[number])) return fail(400, { ...entered, message: 'Choose Female or Male.' });
		const created = await registerPatient({
			email,
			passwordHash: hashPassword(password),
			firstName,
			lastName,
			sex,
			dob,
			phone
		});
		if ('error' in created) return fail(400, { ...entered, message: created.error });
		const sid = await createSession(created.userId);
		cookies.set('sid', sid, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 14 });
		redirect(303, '/patient');
	}
};
