import { error, redirect } from '@sveltejs/kit';
import { accessStatus, doctorForUser, patientByPid } from './clinic';

export async function requireChart(locals: App.Locals, pid: string) {
	if (!locals.user || locals.user.role !== 'doctor') error(401, 'Sign in required');
	const doctor = await doctorForUser(locals.user.id);
	const patient = await patientByPid(pid);
	if (!doctor || !patient) error(404, 'Record not found');
	if ((await accessStatus(patient.id, doctor.id)) !== 'granted') {
		redirect(303, `/doctor/access/${patient.pid}`);
	}
	return { doctor, patient: { ...patient, record_token: null } };
}
