import { error, fail, redirect } from '@sveltejs/kit';
import { removeAddedScan } from '#lib/server/circle';
import { imagingById, patientForUser } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { patient } = await parent();
	const study = await imagingById(patient.id, Number(params.studyId));
	if (!study) error(404, 'Study not found');
	return { study };
}

export const actions = {
	remove: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const removed = await removeAddedScan(patient.id, Number(params.studyId));
		if (!removed) return fail(400, { message: 'That scan is not one you can remove.' });
		redirect(303, '/patient/history?view=images&notice=Scan%20removed');
	}
};
