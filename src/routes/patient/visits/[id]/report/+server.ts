import { error } from '@sveltejs/kit';
import { renderConsultationPdf } from '#lib/server/consult-pdf';
import { loadPatientVisitReport } from '#lib/server/consult-report';
import { actingPatient } from '#lib/server/clinic';

export async function GET({ locals, params }) {
	if (!locals.user) error(401, 'Sign in required');
	const patient = await actingPatient(locals.user);
	if (!patient) error(403, 'Sign in required');
	const report = await loadPatientVisitReport(patient.id, Number(params.id));
	if (!report) error(404, 'That consultation is not on your chart');
	const pdf = await renderConsultationPdf(report);
	return new Response(Buffer.from(pdf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${report.filename}"`,
			'Cache-Control': 'private, no-store'
		}
	});
}
