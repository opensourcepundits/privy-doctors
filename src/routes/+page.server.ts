import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
	if (!locals.user) redirect(303, '/login');
	redirect(303, locals.user.role === 'doctor' ? '/doctor' : '/patient');
}
