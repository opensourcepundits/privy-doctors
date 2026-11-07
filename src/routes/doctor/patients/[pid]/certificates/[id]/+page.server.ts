import { error } from '@sveltejs/kit';
import { medicalCertificateView } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { doctor, patient } = await parent();
	const certificate = await medicalCertificateView(Number(params.id), patient.id);
	if (!certificate) error(404, 'Certificate not found');
	if (certificate.status !== 'issued' && certificate.doctor_id !== doctor.id) error(404, 'Certificate not found');
	const backHref =
		certificate.consult_status === 'in_session'
			? `/doctor/patients/${patient.pid}/consult/orders`
			: certificate.encounter_id
				? `/doctor/patients/${patient.pid}/visits/${certificate.encounter_id}`
				: `/doctor/patients/${patient.pid}/consults/${certificate.consultation_id}`;
	const backLabel = certificate.consult_status === 'in_session' ? 'Orders' : 'Consultation';
	return { certificate, backHref, backLabel };
}
