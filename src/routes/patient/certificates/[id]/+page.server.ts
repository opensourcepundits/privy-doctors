import { error } from '@sveltejs/kit';
import { medicalCertificateView } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { patient } = await parent();
	const certificate = await medicalCertificateView(Number(params.id), patient.id);
	if (!certificate || certificate.status !== 'issued') error(404, 'Certificate not found');
	const backHref = certificate.encounter_id
		? `/patient/visits/${certificate.encounter_id}`
		: '/patient/history?view=consultations';
	return { certificate, backHref, backLabel: 'Consultation' };
}
