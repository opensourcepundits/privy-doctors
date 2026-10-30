import { error, redirect } from '@sveltejs/kit';
import { frequencyTags, mealTags } from '#lib/doses';
import {
	addConsultOrder,
	addPrescriptionPhoto,
	consultForChart,
	fileSignedMedication,
	medicinesCatalog,
	recordMedicineUse,
	removeConsultOrder,
	removePrescriptionPhoto,
	setFiledCompletion
} from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';
import { acceptPrescriptionPhoto } from '#lib/server/uploads';

function completionDate(value: FormDataEntryValue | null) {
	const text = String(value ?? '').trim();
	if (!text) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
	return text;
}

async function context(locals: App.Locals, pid: string, consultId: number) {
	const { doctor, patient } = await requireChart(locals, pid);
	const consult = await consultForChart(patient.id, consultId);
	if (!consult) error(404, 'Consultation not found');
	if (consult.status === 'in_session' && consult.doctor_id === doctor.id) {
		redirect(303, `/doctor/patients/${patient.pid}/consult/orders`);
	}
	if (consult.status !== 'signed' || consult.doctor_id !== doctor.id) {
		error(403, 'Only the doctor who signed this consultation can edit the prescription.');
	}
	return { doctor, patient, consult };
}

export async function load({ params, locals }) {
	const { doctor, patient, consult } = await context(locals, params.pid, Number(params.id));
	const medicines = await medicinesCatalog();
	return { doctor, patient, consult, medicines };
}

export const actions = {
	medication: async ({ request, params, locals }) => {
		const { consult, doctor } = await context(locals, params.pid, Number(params.id));
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		const note = String(data.get('note') ?? '').trim();
		if (!title) return { message: 'Name the medication.' };
		const completes = completionDate(data.get('completes_on'));
		if (completes === false) return { message: 'Enter a valid completion date for this medicine.' };
		const prescriptionCompletes = completionDate(data.get('prescription_completes_on'));
		if (prescriptionCompletes === false) return { message: 'Enter a valid completion date for the prescription.' };
		if (!prescriptionCompletes && !consult.completes_on) {
			return { message: 'Set a completion date for the prescription.' };
		}
		if (prescriptionCompletes) await setFiledCompletion(consult.id, prescriptionCompletes);
		const chosen = [...data.getAll('frequency'), ...data.getAll('meal')].map(String);
		const tags = [...frequencyTags, ...mealTags].filter((label) => chosen.includes(label));
		const frequency = tags.find((label) => (frequencyTags as readonly string[]).includes(label));
		const meal = tags.find((label) => (mealTags as readonly string[]).includes(label));
		const tagText = [frequency, meal].filter(Boolean).join(' · ');
		await addConsultOrder(consult.id, 'medication', title, detail, note, completes, tagText);
		await recordMedicineUse(doctor.id, doctor.name, title, note);
		await fileSignedMedication(consult.id, title, detail, note, completes, tagText);
		return { saved: true };
	},
	completion: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid, Number(params.id));
		const data = await request.formData();
		const completes = completionDate(data.get('completes_on'));
		if (completes === false) return { message: 'Enter a valid completion date for the prescription.' };
		await setFiledCompletion(consult.id, completes);
		return { saved: true };
	},
	remove: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid, Number(params.id));
		const data = await request.formData();
		await removeConsultOrder(Number(data.get('id')), consult.id);
		return { saved: true };
	},
	photo: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid, Number(params.id));
		const data = await request.formData();
		const file = data.get('photo');
		if (!(file instanceof File)) return { message: 'Choose a photo of the prescription.' };
		const accepted = await acceptPrescriptionPhoto(file);
		if ('error' in accepted) return { message: accepted.error };
		const saved = await addPrescriptionPhoto(consult.id, accepted.name, accepted.bytes, accepted.ext, accepted.type);
		if (saved && 'error' in saved) return { message: saved.error };
		return { saved: true };
	},
	removePhoto: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid, Number(params.id));
		const data = await request.formData();
		await removePrescriptionPhoto(Number(data.get('id')), consult.id);
		return { saved: true };
	}
};
