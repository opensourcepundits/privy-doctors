import { fail, redirect } from '@sveltejs/kit';
import { markNotificationsSeen } from '#lib/server/clinic';

export function load() {
	redirect(303, '/patient');
}

export const actions = {
	seen: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'patient') return fail(403, { message: 'Sign in as the patient to update these.' });
		await markNotificationsSeen(locals.user.id);
		return { ok: true };
	}
};
