import { error, redirect } from '@sveltejs/kit';
import { addConsultOrder, doctorForUser, draftConsult, finalizeConsult, patientByPid, removeConsultOrder, updatePharmacy } from '#lib/server/clinic';

async function context(locals: App.Locals, pid: string) {
	if (!locals.user) error(401, 'Sign in required');
	const doctor = await doctorForUser(locals.user.id);
	const patient = await patientByPid(pid);
	if (!doctor || !patient) error(404, 'Record not found');
	const consult = await draftConsult(patient.id, doctor.id);
	return { patient, consult };
}

export async function load({ params, locals }) {
	return context(locals, params.pid);
}

export const actions = {
	medication: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		if (!title) return { message: 'Name the medication.' };
		await addConsultOrder(consult.id, 'medication', title, detail, String(data.get('note') ?? ''));
		return { saved: true };
	},
	referral: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		await addConsultOrder(consult.id, 'referral', String(data.get('title') ?? ''), String(data.get('detail') ?? ''), String(data.get('note') ?? ''));
		return { saved: true };
	},
	test: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		await addConsultOrder(consult.id, 'test', String(data.get('title') ?? ''), String(data.get('detail') ?? ''), String(data.get('note') ?? ''));
		return { saved: true };
	},
	pharmacy: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		const pharmacy = String(data.get('pharmacy') ?? '').trim();
		if (!pharmacy) return { message: 'Enter a pharmacy.' };
		await updatePharmacy(consult.id, pharmacy);
		return { saved: true };
	},
	remove: async ({ request, params, locals }) => {
		await context(locals, params.pid);
		const data = await request.formData();
		await removeConsultOrder(Number(data.get('id')));
		return { saved: true };
	},
	finalize: async ({ params, locals }) => {
		const { consult, patient } = await context(locals, params.pid);
		await finalizeConsult(consult.id);
		redirect(303, `/doctor/patients/${patient.pid}?tab=checkups&notice=Consultation signed and orders transmitted`);
	}
};
