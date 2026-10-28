import { fail, redirect } from '@sveltejs/kit';
import { isoDate } from '#lib/format';
import { addSelfReport, patientForUser } from '#lib/server/clinic';

const severities = ['', 'mild', 'moderate', 'severe'] as const;

export function load() {
	return { today: isoDate(new Date()) };
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'patient') redirect(303, '/login');
		const patient = await patientForUser(locals.user.id);
		if (!patient) redirect(303, '/login');
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const occurredOn = String(data.get('occurred_on') ?? '').trim();
		const duration = String(data.get('duration') ?? '').trim();
		const severity = String(data.get('severity') ?? '').trim();
		const meds = String(data.get('meds_taken') ?? '').trim();
		const detail = String(data.get('detail') ?? '').trim();
		const ongoing = data.get('ongoing') === 'yes';
		const entered = { title, occurredOn, duration, severity, meds, detail, ongoing };
		if (!title) return fail(400, { ...entered, message: 'Name what happened.' });
		if (title.length > 120) return fail(400, { ...entered, message: 'Use a shorter title.' });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || Number.isNaN(Date.parse(`${occurredOn}T00:00:00`)) || occurredOn > isoDate(new Date())) {
			return fail(400, { ...entered, message: 'Choose today or an earlier day.' });
		}
		if (!severities.includes(severity as (typeof severities)[number])) {
			return fail(400, { ...entered, message: 'Choose how strong it felt.' });
		}
		if (detail.length > 1000) return fail(400, { ...entered, message: 'Shorten what you noticed.' });
		await addSelfReport(patient.id, {
			title,
			occurredOn,
			detail,
			duration: duration.slice(0, 80),
			severity,
			meds: meds.slice(0, 240),
			ongoing
		});
		redirect(303, `/patient/history?notice=${encodeURIComponent('Self report filed')}`);
	}
};
