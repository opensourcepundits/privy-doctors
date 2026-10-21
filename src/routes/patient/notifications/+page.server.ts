import { notificationsFor } from '#lib/server/clinic';

export async function load({ parent }) {
	const { user } = await parent();
	return { notifications: await notificationsFor(user.id) };
}
