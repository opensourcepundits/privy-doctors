import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { createSession, sessionCookie } from '#lib/server/auth';
import { claimColleagueInvite, colleagueInvitePreview } from '#lib/server/clinic';
import { hashPassword } from '#lib/server/password';

export async function load({ params, locals }: { params: { token: string }; locals: App.Locals }) {
	const preview = await colleagueInvitePreview(params.token);
	return { signedIn: Boolean(locals.user), preview };
}

export const actions = {
	default: async ({ request, params, cookies, locals, url }: { request: Request; params: { token: string }; cookies: Cookies; locals: App.Locals; url: URL }) => {
		const data = await request.formData();
		const entered = {
			email: String(data.get('email') ?? '').trim().toLowerCase(),
			name: String(data.get('name') ?? ''),
			credentials: String(data.get('credentials') ?? ''),
			specialty: String(data.get('specialty') ?? ''),
			gender: String(data.get('gender') ?? ''),
			practice: String(data.get('practice') ?? ''),
			location: String(data.get('location') ?? ''),
			phone: String(data.get('phone') ?? '')
		};
		const password = String(data.get('password') ?? '');
		if (locals.user) {
			return fail(400, { ...entered, message: 'Sign out of the current account, then open this link again.' });
		}
		if (!entered.email.includes('@') || entered.email.length > 120) {
			return fail(400, { ...entered, message: 'Enter a valid email.' });
		}
		if (password.length < 8 || password.length > 200) {
			return fail(400, { ...entered, message: 'Use a password of 8 to 200 characters.' });
		}
		const claimed = await claimColleagueInvite(params.token, {
			...entered,
			passwordHash: hashPassword(password)
		});
		if ('error' in claimed) return fail(400, { ...entered, message: claimed.error });
		const sid = await createSession(claimed.userId);
		cookies.set('sid', sid, sessionCookie(url));
		redirect(303, '/doctor?notice=' + encodeURIComponent('Welcome. Your colleague account is ready.'));
	}
};
