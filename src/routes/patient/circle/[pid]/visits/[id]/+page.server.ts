import { error, redirect } from '@sveltejs/kit';
import { trusteeFor } from '#lib/server/circle';
import { patientForUser, visitByEncounter } from '#lib/server/clinic';

export async function load({ locals, params }) {
	if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
	const actor = await patientForUser(locals.user.id);
	if (!actor) redirect(303, '/login');
	const access = await trusteeFor(actor.id, params.pid);
	if (!access?.view_chart) error(404, 'That chart is not shared with you');
	const record = await visitByEncounter(access.ownerId, Number(params.id), 0, access.pid);
	if (!record) error(404, 'Consultation not found');
	return { access, record };
}
