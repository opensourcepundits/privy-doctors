import { error } from '@sveltejs/kit';
import { accessStatus, doctorForUser, patientForUser, prescriptionPhotoAccess, prescriptionPhotoBytes } from '#lib/server/clinic';

function downloadName(name: string) {
	const cleaned = name.replace(/[/\\"]/g, '').replace(/[^\w.\- ()]+/g, '').slice(0, 80);
	return cleaned || 'prescription';
}

export async function GET({ params, locals, url }) {
	if (!locals.user) error(401, 'Sign in required');
	const file = await prescriptionPhotoAccess(Number(params.id));
	if (!file) error(404, 'Prescription photo not found');
	if (locals.user.role === 'patient') {
		const patient = await patientForUser(locals.user.id);
		if (!patient || patient.id !== file.patient_id) error(403, 'That photo is not on your chart');
	} else {
		const doctor = await doctorForUser(locals.user.id);
		if (!doctor) error(403, 'Sign in required');
		const granted = (await accessStatus(file.patient_id, doctor.id)) === 'granted';
		if (!granted && doctor.id !== file.doctor_id) error(403, 'That photo is not on a chart you can open');
	}
	const bytes = await prescriptionPhotoBytes(file.id);
	if (!bytes) error(404, 'Prescription photo is missing');
	const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': file.content_type,
			'Content-Disposition': `${disposition}; filename="${downloadName(file.file_name)}"`,
			'Cache-Control': 'private, max-age=3600'
		}
	});
}
