import { ensureSignupInvite } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

export async function load({ params, locals, url }) {
	const chart = await requireChart(locals, params.pid);
	const signupLink = chart.patient.user_id
		? Promise.resolve(null)
		: ensureSignupInvite(chart.patient.id).then((token) => (token ? `${url.origin}/join/${token}` : null));
	return { ...chart, signupLink };
}
