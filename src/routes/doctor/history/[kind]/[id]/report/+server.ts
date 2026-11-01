import { error } from '@sveltejs/kit';
import { renderConsultationPdf } from '#lib/server/consult-pdf';
import { loadConsultationReport } from '#lib/server/consult-report';
import { doctorForUser } from '#lib/server/clinic';

export async function GET({ locals, params }) {
	if (!locals.user || locals.user.role !== 'doctor') error(401, 'Sign in required');
	const doctor = await doctorForUser(locals.user.id);
	if (!doctor) error(403, 'Sign in required');
	const report = await loadConsultationReport(
		{
			id: Number(doctor.id),
			name: String(doctor.name ?? ''),
			credentials: String(doctor.credentials ?? ''),
			specialty: String(doctor.specialty ?? ''),
			npi: doctor.npi ? String(doctor.npi) : null,
			practice: String(doctor.practice ?? ''),
			location: String(doctor.location ?? ''),
			phone: doctor.phone ? String(doctor.phone) : null
		},
		params.kind,
		params.id
	);
	if (!report) error(404, 'That consultation is not in your history');
	const pdf = await renderConsultationPdf(report);
	return new Response(Buffer.from(pdf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${report.filename}"`,
			'Cache-Control': 'private, no-store'
		}
	});
}
