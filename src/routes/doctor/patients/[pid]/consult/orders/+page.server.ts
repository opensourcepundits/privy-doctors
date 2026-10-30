import { redirect } from '@sveltejs/kit';
import { frequencyTags, mealTags } from '#lib/doses';
import { addConsultOrder, addPrescriptionPhoto, addReferral, draftConsult, finalizeConsult, medicinesCatalog, prescriptionPhotos, recordMedicineUse, referralDoctors, removeConsultOrder, removePrescriptionPhoto, setConsultCompletion } from '#lib/server/clinic';
import { requireChart } from '#lib/server/guard';
import { acceptPrescriptionPhoto } from '#lib/server/uploads';

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

export async function load({ parent }) {
	const { doctor, patient } = await parent();
	const consult = await draftConsult(patient.id, doctor.id);
	const [doctors, medicines, photos] = await Promise.all([
		referralDoctors().then((rows) => rows.filter((item) => item.id !== doctor.id)),
		medicinesCatalog(),
		prescriptionPhotos(consult.id)
	]);
	return { doctor, patient, consult, doctors, medicines, photos };
}

export const actions = {
	medication: async ({ request, params, locals }) => {
		const { consult, doctor } = await context(locals, params.pid);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		const note = String(data.get('note') ?? '').trim();
		if (!title) return { message: 'Name the medication.' };
		const completes = completionDate(data.get('completes_on'));
		if (completes === false) return { message: 'Enter a valid completion date for this medicine.' };
		const chosen = [...data.getAll('frequency'), ...data.getAll('meal')].map(String);
		const tags = [...frequencyTags, ...mealTags].filter((label) => chosen.includes(label));
		const frequency = tags.find((label) => (frequencyTags as readonly string[]).includes(label));
		const meal = tags.find((label) => (mealTags as readonly string[]).includes(label));
		await addConsultOrder(
			consult.id,
			'medication',
			title,
			detail,
			note,
			completes,
			[frequency, meal].filter(Boolean).join(' · ')
		);
		await recordMedicineUse(doctor.id, doctor.name, title, note);
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
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		await removeConsultOrder(Number(data.get('id')), consult.id);
		return { saved: true };
	},
	photo: async ({ request, params, locals }) => {
		const { consult } = await context(locals, params.pid);
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
		const { consult } = await context(locals, params.pid);
		const data = await request.formData();
		await removePrescriptionPhoto(Number(data.get('id')), consult.id);
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
			: filed?.photos
				? 'Consultation saved with a photograph of the prescription'
				: 'Consultation and bill saved to this patient record';
		redirect(303, `/doctor/patients/${patient.pid}?tab=consults&notice=${notice}`);
	}
};
