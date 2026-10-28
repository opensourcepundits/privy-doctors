import { fail, redirect } from '@sveltejs/kit';
import { doctorForUser, redeemAccessCode, redeemRecordToken } from '#lib/server/clinic';

async function doctor(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
	const row = await doctorForUser(locals.user.id);
	if (!row) redirect(303, '/login');
	return row;
}

export const actions = {
	scan: async ({ request, locals }) => {
		const clinician = await doctor(locals);
		const data = await request.formData();
		const result = await redeemRecordToken(clinician.id, String(data.get('payload') ?? ''));
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, `/doctor/patients/${result.pid}?notice=${encodeURIComponent('Record access granted')}`);
	},
	code: async ({ request, locals }) => {
		const clinician = await doctor(locals);
		const data = await request.formData();
		const result = await redeemAccessCode(clinician.id, String(data.get('code') ?? ''));
		if ('error' in result) return fail(400, { message: result.error });
		redirect(303, `/doctor/patients/${result.pid}?notice=${encodeURIComponent('Record access granted')}`);
	}
};
