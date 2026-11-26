import { isoDate } from '#lib/format';

const severities = ['', 'mild', 'moderate', 'severe'] as const;

export const reportKinds = [
	['symptom', 'Symptom'],
	['treatment', 'Treatment'],
	['medicine', 'Medicine'],
	['scan', 'Scan'],
	['laboratory', 'Laboratory'],
	['vaccination', 'Vaccination'],
	['procedure', 'Procedure'],
	['vital', 'Vital sign'],
	['observation', 'Observation'],
	['other', 'Other']
] as const;

export type ReportKind = (typeof reportKinds)[number][0];

const kindIds = new Set<string>(reportKinds.map(([id]) => id));

export function reportKindLabel(value: string | null | undefined) {
	return reportKinds.find(([id]) => id === value)?.[1] ?? '';
}

export function readSelfReport(data: FormData) {
	const kind = String(data.get('kind') ?? '').trim();
	const title = String(data.get('title') ?? '').trim();
	const occurredOn = String(data.get('occurred_on') ?? '').trim();
	const location = String(data.get('location') ?? '').trim();
	const duration = String(data.get('duration') ?? '').trim();
	const severity = String(data.get('severity') ?? '').trim();
	const meds = String(data.get('meds_taken') ?? '').trim();
	const detail = String(data.get('detail') ?? '').trim();
	const ongoing = data.get('ongoing') === 'yes';
	const entered = { kind, title, occurredOn, location, duration, severity, meds, detail, ongoing };
	if (!kindIds.has(kind)) return { ...entered, message: 'Choose what you are reporting.' };
	if (!title) return { ...entered, message: 'Name what happened.' };
	if (title.length > 120) return { ...entered, message: 'Use a shorter title.' };
	if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || Number.isNaN(Date.parse(`${occurredOn}T00:00:00`)) || occurredOn > isoDate(new Date())) {
		return { ...entered, message: 'Choose today or an earlier day.' };
	}
	if (location.length > 160) return { ...entered, message: 'Use a shorter location.' };
	if (!severities.includes(severity as (typeof severities)[number])) {
		return { ...entered, message: 'Choose how strong it felt.' };
	}
	if (detail.length > 1000) return { ...entered, message: 'Shorten what you noticed.' };
	return {
		...entered,
		message: '',
		value: {
			kind,
			title,
			occurredOn,
			location: location.slice(0, 160),
			detail,
			duration: duration.slice(0, 80),
			severity,
			meds: meds.slice(0, 240),
			ongoing
		}
	};
}
