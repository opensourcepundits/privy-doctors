import { fail, redirect } from '@sveltejs/kit';
import {
	addTrustee,
	addedRecords,
	circleLists,
	removeAddedReport,
	removeAddedScan,
	removeTrustee,
	setTrusteePower
} from '#lib/server/circle';
import { patientForUser } from '#lib/server/clinic';

const powers = new Set(['view_chart', 'accept_access', 'add_records']);

export async function load({ locals, parent }) {
	const { preview } = await parent();
	if (!locals.user || preview) return { preview, trustees: [], sharedWithMe: [], added: { reports: [], scans: [] } };
	const patient = await patientForUser(locals.user.id);
	if (!patient) redirect(303, '/login');
	const [lists, added] = await Promise.all([circleLists(patient.id), addedRecords(patient.id)]);
	return { preview, ...lists, added };
}

export const actions = {
	add: async ({ request, locals }) => {
		const patient = await signedIn(locals);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const result = await addTrustee(patient.id, String(data.get('query') ?? ''));
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, '/patient/circle?notice=Added%20to%20your%20circle');
	},
	power: async ({ request, locals }) => {
		const patient = await signedIn(locals);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const power = String(data.get('power') ?? '');
		if (!powers.has(power)) return fail(400, { message: 'That permission is not available.' });
		const saved = await setTrusteePower(patient.id, Number(data.get('id')), power, data.get('allow') === 'yes');
		if (!saved) return fail(400, { message: 'That person is not in your circle.' });
		return { saved: power };
	},
	remove: async ({ request, locals }) => {
		const patient = await signedIn(locals);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		await removeTrustee(patient.id, Number(data.get('id')));
		redirect(303, '/patient/circle?notice=Removed%20from%20your%20circle');
	},
	removeReport: async ({ request, locals }) => {
		const patient = await signedIn(locals);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const removed = await removeAddedReport(patient.id, Number(data.get('id')));
		if (!removed) return fail(400, { message: 'That treatment is not one you can remove.' });
		redirect(303, '/patient/circle?notice=Treatment%20removed');
	},
	removeScan: async ({ request, locals }) => {
		const patient = await signedIn(locals);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const removed = await removeAddedScan(patient.id, Number(data.get('id')));
		if (!removed) return fail(400, { message: 'That scan is not one you can remove.' });
		redirect(303, '/patient/circle?notice=Scan%20removed');
	}
};

async function signedIn(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'patient') return null;
	return patientForUser(locals.user.id);
}
