import { redirect } from '@sveltejs/kit';
import { addConsultEntry, draftConsult, referralForFollowUp, removeConsultEntry, saveNarrative } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

async function context(locals: App.Locals, pid: string) {
	const { doctor, patient } = await requireChart(locals, pid);
	const consult = await draftConsult(patient.id, doctor.id);
	return { doctor, patient, consult };
}

export async function load({ parent }) {
	const { doctor, patient } = await parent();
	const consult = await draftConsult(patient.id, doctor.id);
	return { doctor, patient, consult, referral: await referralForFollowUp(consult.id) };
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
