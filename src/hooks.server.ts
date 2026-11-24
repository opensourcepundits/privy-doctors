import type { Handle } from '@sveltejs/kit/hooks';
import { userFromSession } from '#lib/server/auth';
import { ensureChartCrypto } from '#lib/server/chart-crypto';

export const handle: Handle = async ({ event, resolve }) => {
	await ensureChartCrypto();
	event.locals.user = await userFromSession(event.cookies.get('sid'));
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};
