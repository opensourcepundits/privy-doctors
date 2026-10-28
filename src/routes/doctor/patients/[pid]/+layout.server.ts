import { requireChart } from '#lib/server/guard';

export async function load({ params, locals }) {
	return requireChart(locals, params.pid);
}
