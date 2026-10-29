import { fail, redirect } from '@sveltejs/kit';
import { isoDate } from '#lib/format';
import { readSelfReport } from '#lib/report-form';
import { addReportFile, addSelfReport, alertClinicians, alertReportDoctors, patientForUser } from '#lib/server/clinic';
import { saveReportFile, sniffDocument } from '#lib/server/uploads';

export async function load() {
	return { today: isoDate(new Date()), clinicians: await alertClinicians() };
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const parsed = readSelfReport(data);
		if (!parsed.value) return fail(400, parsed);
		const picked = data.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
		if (picked.length > 4) return fail(400, { ...parsed, message: 'Attach at most 4 documents.' });
		const prepared: { name: string; bytes: Buffer; ext: string; type: string }[] = [];
		for (const file of picked) {
			if (file.size > 8 * 1024 * 1024) return fail(400, { ...parsed, message: 'Each document must be 8 MB or smaller.' });
			const bytes = Buffer.from(await file.arrayBuffer());
			const kind = sniffDocument(bytes);
			if (!kind) return fail(400, { ...parsed, message: 'Attach an image or a PDF.' });
			prepared.push({
				name: file.name.replace(/[/\\]/g, '').slice(0, 120) || `document.${kind.ext}`,
				bytes,
				ext: kind.ext,
				type: kind.type
			});
		}
		const reportId = await addSelfReport(patient.id, parsed.value);
		for (const [index, file] of prepared.entries()) {
			const stored = `report-${reportId}-${index + 1}.${file.ext}`;
			await saveReportFile(stored, file.bytes);
			await addReportFile(reportId, file.name, stored, file.type);
		}
		const doctorIds = data.getAll('doctor_id').map((value) => Number(value));
		const alerted = await alertReportDoctors(reportId, patient, doctorIds, parsed.value.title);
		const notice = alerted.length ? `Self report filed. Alerted ${alerted.join(', ')}` : 'Self report filed';
		redirect(303, `/patient/history?notice=${encodeURIComponent(notice)}`);
	}
};
