import { redirect } from '@sveltejs/kit';
import { addConsultOrder, addReferral, draftConsult, finalizeConsult, referralDoctors, removeConsultOrder, setConsultCompletion } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';

function completionDate(value: FormDataEntryValue | null) {
	const text = String(value ?? '').trim();
	if (!text) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
	return text;
}

async function context(locals: App.Locals, pid: string) {
	const { doctor, patient } = await requireChart(locals, pid);
	const consult = await draftConsult(patient.id, doctor.id);
	return { doctor, patient, consult };
}

export async function load({ params, locals }) {
	const ctx = await context(locals, params.pid);
	const doctors = (await referralDoctors()).filter((item) => item.id !== ctx.doctor.id);
	return { ...ctx, doctors };
}

export const actions = {
	medication: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		if (!title) return { message: 'Name the medication.' };
		const completes = completionDate(data.get('completes_on'));
		if (completes === false) return { message: 'Enter a valid completion date for this medicine.' };
		await addConsultOrder(consult.id, 'medication', title, detail, String(data.get('note') ?? ''), completes);
		return { saved: true };
	},
	referral: async ({ request, params, locals }) => {
		const { consult, doctor } = await context(locals, params.pid);
		const data = await request.formData();
		const result = await addReferral(consult.id, doctor.id, Number(data.get('doctor_id')), String(data.get('note') ?? '').trim());
		if (result.error) return { message: result.error, referral: true };
		return { saved: true };
	},
	test: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		await addConsultOrder(consult.id, 'test', String(data.get('title') ?? ''), String(data.get('detail') ?? ''), String(data.get('note') ?? ''));
		return { saved: true };
	},
	completion: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		const completes = completionDate(data.get('completes_on'));
		if (completes === false) return { message: 'Enter a valid completion date for the prescription.' };
		await setConsultCompletion(consult.id, completes);
		return { saved: true };
	},
	remove: async ({ request, params, locals }) => {
		await context(locals, params.pid);
		const data = await request.formData();
		await removeConsultOrder(Number(data.get('id')));
		return { saved: true };
	},
	finalize: async ({ request, params, locals }) => {
		const { consult, patient } = await context(locals, params.pid);
		const data = await request.formData();
		const completes = completionDate(data.get('completes_on'));
		if (completes === false) return { message: 'Enter a valid completion date for the prescription.' };
		const filed = await finalizeConsult(consult.id, completes);
		if (filed && 'error' in filed) return { message: filed.error, completesOn: completes ?? '' };
		const notice = filed?.medications
			? 'Consultation, prescriptions, and bill saved to this patient record'
			: 'Consultation and bill saved to this patient record';
		redirect(303, `/doctor/patients/${patient.pid}?tab=consults&notice=${notice}`);
	}
};
