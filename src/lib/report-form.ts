import { isoDate } from '#lib/format';

const severities = ['', 'mild', 'moderate', 'severe'] as const;

export function readSelfReport(data: FormData) {
	const title = String(data.get('title') ?? '').trim();
	const occurredOn = String(data.get('occurred_on') ?? '').trim();
	const duration = String(data.get('duration') ?? '').trim();
	const severity = String(data.get('severity') ?? '').trim();
	const meds = String(data.get('meds_taken') ?? '').trim();
	const detail = String(data.get('detail') ?? '').trim();
	const ongoing = data.get('ongoing') === 'yes';
	const entered = { title, occurredOn, duration, severity, meds, detail, ongoing };
	if (!title) return { ...entered, message: 'Name what happened.' };
	if (title.length > 120) return { ...entered, message: 'Use a shorter title.' };
	if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || Number.isNaN(Date.parse(`${occurredOn}T00:00:00`)) || occurredOn > isoDate(new Date())) {
		return { ...entered, message: 'Choose today or an earlier day.' };
	}
	if (!severities.includes(severity as (typeof severities)[number])) {
		return { ...entered, message: 'Choose how strong it felt.' };
	}
	if (detail.length > 1000) return { ...entered, message: 'Shorten what you noticed.' };
	return {
		...entered,
		message: '',
		value: {
			title,
			occurredOn,
			detail,
			duration: duration.slice(0, 80),
			severity,
			meds: meds.slice(0, 240),
			ongoing
		}
	};
}
