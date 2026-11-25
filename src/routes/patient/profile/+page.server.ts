import { fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { formatDate } from '#lib/format';
import {
	accountEmail,
	actingPatient,
	activeAccessCode,
	createAccessCode,
	doctorById,
	encountersFor,
	ensureRecordToken,
	patientForUser,
	recordPayload,
	shredPatient,
	updatePatientField
} from '#lib/server/clinic';

export function load({ parent }: { parent: () => Promise<{ patient: { id: number; primary_doctor_id: number | null; user_id: number | null; shredded?: boolean }; preview: boolean }> }) {
	return {
		pass: parent().then(async ({ patient, preview }) => {
			const [clinician, email] = await Promise.all([
				doctorById(patient.primary_doctor_id),
				accountEmail(patient.user_id)
			]);
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
				code: preview ? null : await activeAccessCode(patient.id)
			};
		}),
		consultations: parent().then(async ({ patient }) => {
			if (patient.shredded) return [];
			const rows = await encountersFor(patient.id);
			return rows.map((row: Record<string, unknown>) => {
				const focus = typeof row.focus === 'string' && row.focus.trim() ? row.focus.trim() : 'Consultation';
				const doctor = typeof row.doctor_name === 'string' ? row.doctor_name.trim() : '';
				const when = row.occurred_on instanceof Date || typeof row.occurred_on === 'string' ? formatDate(row.occurred_on) : '';
				return {
					id: Number(row.id),
					label: [when, focus, doctor].filter(Boolean).join(' · ')
				};
			});
		})
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
	},
	shred: async ({ locals, request }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		if (data.get('understood') !== 'yes') {
			return fail(400, { shred: true, message: 'Check “I understand” before deleting the record.' });
		}
		if (String(data.get('confirm') ?? '').trim().toLowerCase() !== 'confirm') {
			return fail(400, { shred: true, message: 'Type confirm to delete the record.' });
		}
		await shredPatient(patient.id);
		redirect(303, `/patient/profile?notice=${encodeURIComponent('Medical record deleted')}`);
	}
};
