import { fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import {
	accountEmail,
	actingPatient,
	activeAccessCode,
	createAccessCode,
	doctorById,
	ensureRecordToken,
	patientForUser,
	recordPayload,
	updatePatientField
} from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient, preview } = await parent();
	const [clinician, email] = await Promise.all([doctorById(patient.primary_doctor_id), accountEmail(patient.user_id)]);
	if (preview) return { clinician, email, qr: null, code: null };
	const token = await ensureRecordToken(patient.id);
	const svg = await QRCode.toString(recordPayload(token), {
		type: 'svg',
		margin: 1,
		errorCorrectionLevel: 'M',
		width: 208
	});
	return {
		clinician,
		email,
		qr: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
		code: await activeAccessCode(patient.id)
	};
}

export const actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const patient = await actingPatient(locals.user);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const field = String(data.get('field') ?? '');
		const value = String(data.get('value') ?? '');
		if (data.get('confirmed') !== 'yes') {
			return fail(400, { message: 'Confirm this change before it is saved.', field, value });
		}
		const result = await updatePatientField(patient.id, field, value);
		if ('error' in result) return fail(400, { message: result.error, field, value });
		redirect(303, `/patient/profile?notice=${encodeURIComponent('Profile updated')}`);
	},
	code: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		await createAccessCode(patient.id);
		redirect(303, `/patient/profile?notice=${encodeURIComponent('Access code created')}`);
	}
};
