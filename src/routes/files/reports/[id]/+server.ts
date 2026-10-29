import { error } from '@sveltejs/kit';
import { accessStatus, doctorForUser, patientForUser, reportAlerted, reportFileFor } from '#lib/server/clinic';
import { readReportFile } from '#lib/server/uploads';

function downloadName(name: string) {
	const cleaned = name.replace(/[/\\"]/g, '').replace(/[^\w.\- ()]+/g, '').slice(0, 80);
	return cleaned || 'document';
}

export async function GET({ params, locals, url }) {
	if (!locals.user) error(401, 'Sign in required');
	const file = await reportFileFor(Number(params.id));
	if (!file) error(404, 'Document not found');
	if (locals.user.role === 'patient') {
		const patient = await patientForUser(locals.user.id);
		if (!patient || patient.id !== file.patient_id) error(403, 'That document is not on your chart');
	} else {
		const doctor = await doctorForUser(locals.user.id);
		if (!doctor) error(403, 'Sign in required');
		const granted = (await accessStatus(file.patient_id, doctor.id)) === 'granted';
		const alerted = await reportAlerted(file.report_id, doctor.id);
		if (!granted && !alerted) error(403, 'That document is not on a chart you can open');
	}
	let bytes: Buffer;
	try {
		bytes = await readReportFile(file.stored_name);
	} catch {
		error(404, 'Document file is missing');
	}
	const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': file.content_type,
			'Content-Disposition': `${disposition}; filename="${downloadName(file.file_name)}"`
		}
	});
}
