import { error, redirect } from '@sveltejs/kit';
import { actingPatient, invoicesFor, payInvoice } from '#lib/server/clinic';

export async function load({ parent }) {
	const { patient } = await parent();
	const invoices = await invoicesFor(patient.id);
	const outstanding = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.patient_due), 0);
	return { invoices, outstanding };
}

export const actions = {
	pay: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Sign in required');
		const patient = await actingPatient(locals.user);
		if (!patient) error(404, 'Patient not found');
		const data = await request.formData();
		await payInvoice(Number(data.get('id')), patient.id, String(data.get('method') ?? 'Card'));
		redirect(303, '/patient/billing?notice=Payment received');
	}
};
