import { error, fail, redirect } from '@sveltejs/kit';
import { isoDate } from '#lib/format';
import { readSelfReport } from '#lib/report-form';
import { patientForUser, selfReportById, updateSelfReport } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { patient, preview } = await parent();
	const report = await selfReportById(patient.id, Number(params.id));
	if (!report) error(404, 'Self report not found');
	return {
		report,
		occurredOn: isoDate(report.occurred_on),
		today: isoDate(new Date()),
		preview
	};
}

export const actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const parsed = readSelfReport(await request.formData());
		if (!parsed.value) return fail(400, parsed);
		const result = await updateSelfReport(patient.id, Number(params.id), parsed.value);
		if ('error' in result) return fail(400, { ...parsed, message: result.error });
		const notice = 'unchanged' in result ? 'No changes to save' : 'Self report updated';
		redirect(303, `/patient/reports/${params.id}?notice=${encodeURIComponent(notice)}`);
	}
};
