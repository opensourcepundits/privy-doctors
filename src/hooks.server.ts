import type { Handle } from '@sveltejs/kit';
import { userFromSession } from '#lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await userFromSession(event.cookies.get('sid'));
	return resolve(event);
};
