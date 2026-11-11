import { actingPatient, encountersFor, imagingFor, labsFor, selfReportsFor, vaccinationsForPatient } from '#lib/server/clinic';

export function load({ locals }: { locals: App.Locals }) {
	return { record: historyFor(locals) };
}

async function historyFor(locals: App.Locals) {
	if (!locals.user) return null;
	const patient = await actingPatient(locals.user);
	if (!patient) return null;
	const [encounters, imaging, labs, reports, vaccinations] = await Promise.all([
		encountersFor(patient.id),
		imagingFor(patient.id),
		labsFor(patient.id),
		selfReportsFor(patient.id),
		vaccinationsForPatient(patient.id)
	]);
	return { encounters, imaging, labs, reports, vaccinations };
}
