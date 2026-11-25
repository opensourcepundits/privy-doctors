import { error } from '@sveltejs/kit';
import { canReadAddedScan, readAddedScan } from '#lib/server/circle';
import { actingPatient } from '#lib/server/clinic';

export async function GET({ locals, params, url }) {
	if (!locals.user) error(401, 'Sign in required');
	const actor = await actingPatient(locals.user);
	if (!actor) error(403, 'Sign in required');
	const file = await readAddedScan(Number(params.id));
	if (!file) error(404, 'Scan not found');
	if (!(await canReadAddedScan(actor.id, file.patientId))) error(403, 'That scan is not on a chart you can open');
	const name = (file.title || 'scan').replace(/[/\\"]/g, '').replace(/[^\w.\- ()]+/g, '').slice(0, 80) || 'scan';
	const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
	return new Response(new Uint8Array(file.bytes), {
		headers: {
			'Content-Type': file.type,
			'Content-Disposition': `${disposition}; filename="${name}"`,
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}
