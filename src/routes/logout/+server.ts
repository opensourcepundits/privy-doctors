import { redirect } from '@sveltejs/kit';
import { deleteSession, userFromSession } from '#lib/server/auth';

export const POST = async ({ cookies }) => {
	const user = await userFromSession(cookies.get('sid'));
	await deleteSession(cookies.get('sid'));
	cookies.delete('sid', { path: '/' });
	redirect(303, user?.role === 'doctor' ? '/doctors/login' : '/login');
};
