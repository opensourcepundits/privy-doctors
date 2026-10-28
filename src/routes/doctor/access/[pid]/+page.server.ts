import { error, redirect } from '@sveltejs/kit';
import { accessStatus, doctorForUser, patientByPid, requestChartAccess } from '#lib/server/clinic';

export async function load({ params, parent }) {
	const { doctor } = await parent();
	const patient = await patientByPid(params.pid);
	if (!patient) error(404, 'Patient not found');
	const status = await accessStatus(patient.id, doctor.id);
	if (status === 'granted') redirect(303, `/doctor/patients/${patient.pid}`);
	return {
		status,
		patient: {
			pid: patient.pid,
			first_name: patient.first_name,
			last_name: patient.last_name,
			dob: patient.dob,
			sex: patient.sex,
			has_portal: Boolean(patient.user_id)
		}
	};
}

export const actions = {
	request: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'doctor') redirect(303, '/login');
		const doctor = await doctorForUser(locals.user.id);
		const patient = await patientByPid(params.pid);
		if (!doctor || !patient) error(404, 'Record not found');
		const result = await requestChartAccess(patient.id, doctor.id);
		if (result === 'granted') redirect(303, `/doctor/patients/${patient.pid}`);
		const notice = result === 'requested' ? 'The patient was asked to allow access' : '';
		redirect(303, `/doctor/access/${patient.pid}${notice ? `?notice=${encodeURIComponent(notice)}` : ''}`);
	}
};
