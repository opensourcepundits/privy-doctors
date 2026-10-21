import { error, redirect } from '@sveltejs/kit';
import { addConsultEntry, doctorForUser, draftConsult, patientByPid, removeConsultEntry, saveNarrative } from '#lib/server/clinic';

async function context(locals: App.Locals, pid: string) {
	if (!locals.user) error(401, 'Sign in required');
	const doctor = await doctorForUser(locals.user.id);
	const patient = await patientByPid(pid);
	if (!doctor || !patient) error(404, 'Record not found');
	const consult = await draftConsult(patient.id, doctor.id);
	return { doctor, patient, consult };
}

export async function load({ params, locals }) {
	return context(locals, params.pid);
}

export const actions = {
	add: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		const kind = String(data.get('kind') ?? 'Observation');
		const label = String(data.get('label') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		if (!label) return { message: 'Add a label for the log item.' };
		await addConsultEntry(consult.id, kind, label, detail);
		return { saved: true };
	},
	remove: async ({ request, params, locals }) => {
		await context(locals, params.pid);
		const data = await request.formData();
		await removeConsultEntry(Number(data.get('id')));
		return { saved: true };
	},
	continue: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		await saveNarrative(consult.id, String(data.get('narrative') ?? ''), String(data.get('modality') ?? 'in_person'));
		redirect(303, `/doctor/patients/${params.pid}/consult/orders`);
	}
};
