import { fail, redirect } from '@sveltejs/kit';
import { createSession } from '#lib/server/auth';
import { claimSignupInvite, signupPreview } from '#lib/server/clinic';
import { hashPassword } from '#lib/server/password';

export async function load({ params, locals }: { params: { token: string }; locals: App.Locals }) {
	const preview = await signupPreview(params.token);
	return { signedIn: Boolean(locals.user), preview };
}

export const actions = {
	default: async ({ request, params, cookies, locals }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const nic = String(data.get('nic') ?? '').trim();
		const passport = String(data.get('passport') ?? '').trim();
		const phone = String(data.get('phone') ?? '').trim();
		const entered = { email, nic, passport, phone };
		if (locals.user) {
			return fail(400, { ...entered, message: 'Sign out of the current account, then open this link again.' });
		}
		if (!email.includes('@')) return fail(400, { ...entered, message: 'Enter a valid email.' });
		if (password.length < 8) return fail(400, { ...entered, message: 'Use a password of at least 8 characters.' });
		const claimed = await claimSignupInvite(params.token, {
			email,
			passwordHash: hashPassword(password),
			nic,
			passport,
			phone
		});
		if ('error' in claimed) return fail(400, { ...entered, message: claimed.error });
		const sid = await createSession(claimed.userId);
		cookies.set('sid', sid, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 14 });
		redirect(303, '/patient/history?notice=' + encodeURIComponent('Your clinic consultations are on this timeline.'));
	}
};
