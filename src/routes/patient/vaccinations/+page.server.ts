import { fail, redirect } from '@sveltejs/kit';
import { liveDay } from '#lib/format';
import { patientForUser, selfReportVaccination, vaccinationsForPatient } from '#lib/server/clinic';
import { optionalImage } from '#lib/server/uploads';

export function load({ parent }: { parent: () => Promise<{ patient: { id: number }; preview: boolean }> }) {
	return {
		today: liveDay(),
		card: parent().then(async ({ patient, preview }) => ({
			preview,
			vaccinations: await vaccinationsForPatient(patient.id)
		}))
	};
}

export const actions = {
	report: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') {
			return fail(401, { message: 'Sign in as the patient to add a vaccination.' });
		}
		const patient = await patientForUser(locals.user.id);
		if (!patient) return fail(401, { message: 'Sign in as the patient to add a vaccination.' });
		const data = await request.formData();
		const proof = await optionalImage(data.get('proof'));
		const kept = {
			name: String(data.get('name') ?? ''),
			givenOn: String(data.get('given_on') ?? ''),
			lot: String(data.get('lot') ?? ''),
			site: String(data.get('site') ?? ''),
			note: String(data.get('note') ?? '')
		};
		if (proof && 'error' in proof) return fail(400, { message: proof.error, ...kept });
		const result = await selfReportVaccination(patient.id, kept, proof);
		if ('error' in result) return fail(400, { message: result.error, ...kept });
		redirect(303, '/patient/vaccinations?notice=Vaccination added to your card');
	}
};
