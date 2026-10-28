import { requireChart } from '#lib/server/guard';

export async function load({ params, locals }) {
	await requireChart(locals, params.pid);
	return {};
}
