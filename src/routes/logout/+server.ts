import { redirect } from '@sveltejs/kit';
import { deleteSession, sessionCookie, userFromSession } from '#lib/server/auth';

export const POST = async ({ cookies, url }) => {
	const user = await userFromSession(cookies.get('sid'));
	await deleteSession(cookies.get('sid'));
	const { path, httpOnly, sameSite, secure } = sessionCookie(url);
	cookies.delete('sid', { path, httpOnly, sameSite, secure });
	redirect(303, user?.role === 'doctor' ? '/doctors/login' : '/login');
};
