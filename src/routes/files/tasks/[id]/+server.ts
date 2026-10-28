import { error } from '@sveltejs/kit';
import { accessStatus, doctorForUser, patientForUser, taskFile } from '#lib/server/clinic';
import { readTaskPdf } from '#lib/server/uploads';

function downloadName(name: string | null) {
	const cleaned = (name ?? 'result.pdf').replace(/[/\\"]/g, '').replace(/[^\w.\- ()]+/g, '').slice(0, 80);
	const base = cleaned || 'result.pdf';
	return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export async function GET({ params, locals, url }) {
	if (!locals.user) error(401, 'Sign in required');
	const task = await taskFile(Number(params.id));
	if (!task?.stored_name) error(404, 'Result not found');
	if (locals.user.role === 'patient') {
		const patient = await patientForUser(locals.user.id);
		if (!patient || patient.id !== task.patient_id) error(403, 'That result is not on your chart');
	} else {
		const doctor = await doctorForUser(locals.user.id);
		if (!doctor || (await accessStatus(task.patient_id, doctor.id)) !== 'granted') {
			error(403, 'That result is not on a chart you can open');
		}
	}
	let bytes: Buffer;
	try {
		bytes = await readTaskPdf(task.id);
	} catch {
		error(404, 'Result file is missing');
	}
	const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `${disposition}; filename="${downloadName(task.file_name)}"`
		}
	});
}
