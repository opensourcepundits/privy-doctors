import { error, fail, redirect } from '@sveltejs/kit';
import { isoDate } from '#lib/format';
import {
	addTrusteeScan,
	addTrusteeTreatment,
	prepareTrusteeFile,
	trusteeDecide,
	trusteeFor,
	trusteeVisits
} from '#lib/server/circle';
import { patientForUser, pendingChartRequests } from '#lib/server/clinic';

export async function load({ locals, params }) {
	const actor = await signedIn(locals);
	if (!actor) redirect(303, '/login');
	const access = await trusteeFor(actor.id, params.pid);
	if (!access) error(404, 'That chart is not shared with you');
	const visits = access.view_chart ? await trusteeVisits(actor.id, params.pid) : null;
	const requests = access.accept_access ? await pendingChartRequests(access.ownerId) : [];
	return {
		access,
		visits: visits?.visits ?? [],
		requests,
		today: isoDate(new Date())
	};
}

export const actions = {
	allow: async ({ request, locals, params }) => decide(locals, params.pid, request, true),
	deny: async ({ request, locals, params }) => decide(locals, params.pid, request, false),
	treatment: async ({ request, locals, params }) => {
		const actor = await signedIn(locals);
		if (!actor) redirect(303, '/login');
		const data = await request.formData();
		const result = await addTrusteeTreatment(actor.id, params.pid, {
			title: String(data.get('title') ?? ''),
			occurredOn: String(data.get('occurred_on') ?? ''),
			detail: String(data.get('detail') ?? '')
		});
		if ('error' in result) return fail(400, { message: result.error, form: 'treatment' });
		redirect(303, `/patient/circle/${params.pid}?notice=${encodeURIComponent('Treatment added')}`);
	},
	scan: async ({ request, locals, params }) => {
		const actor = await signedIn(locals);
		if (!actor) redirect(303, '/login');
		const data = await request.formData();
		const picked = data.get('file');
		if (!(picked instanceof File)) return fail(400, { message: 'Choose an image or a PDF.', form: 'scan' });
		const file = await prepareTrusteeFile(picked);
		if ('error' in file) return fail(400, { message: file.error, form: 'scan' });
		const result = await addTrusteeScan(actor.id, params.pid, {
			title: String(data.get('title') ?? ''),
			performedOn: String(data.get('performed_on') ?? '')
		}, file);
		if ('error' in result) return fail(400, { message: result.error, form: 'scan' });
		redirect(303, `/patient/circle/${params.pid}?notice=${encodeURIComponent('Scan added')}`);
	}
};

async function decide(locals: App.Locals, pid: string, request: Request, allow: boolean) {
	const actor = await signedIn(locals);
	if (!actor) redirect(303, '/login');
	const data = await request.formData();
	const result = await trusteeDecide(actor.id, pid, Number(data.get('id')), allow);
	if ('error' in result) return fail(400, { message: result.error });
	redirect(303, `/patient/circle/${pid}?notice=${encodeURIComponent(allow ? 'Request allowed' : 'Request declined')}`);
}

async function signedIn(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'patient') return null;
	return patientForUser(locals.user.id);
}
