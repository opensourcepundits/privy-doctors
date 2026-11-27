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
	['observation', 'Observation'],
	['other', 'Other']
] as const;

export type ReportKind = (typeof reportKinds)[number][0];

const retiredKinds: Record<string, string> = {
	vital: 'Vital sign'
};

const kindIds = new Set<string>(reportKinds.map(([id]) => id));

export type MedEntry = { name: string; dose: string };

export type SelfReportDraft = {
	kind: string;
	title: string;
	occurredOn: string;
	endedOn: string;
	location: string;
	duration: string;
	severity: string;
	meds: MedEntry[];
	detail: string;
	ongoing: boolean;
};

export function isReportKind(value: string | null | undefined): value is ReportKind {
	return typeof value === 'string' && kindIds.has(value);
}

export function reportKindLabel(value: string | null | undefined) {
	if (!value) return '';
	return reportKinds.find(([id]) => id === value)?.[1] ?? retiredKinds[value] ?? '';
}

export function reportShows(kind: string | null | undefined, legacy = false) {
	return {
		range: kind === 'treatment',
		symptom: kind === 'symptom' || (legacy && !kind)
	};
}

export function parseMeds(raw: string | null | undefined): MedEntry[] {
	const text = raw?.trim() ?? '';
	if (!text) return [];
	if (text.startsWith('[')) {
		try {
			const parsed = JSON.parse(text) as unknown;
			if (Array.isArray(parsed)) {
				return parsed.flatMap((item) => {
					if (!item || typeof item !== 'object') return [];
					const record = item as { name?: unknown; dose?: unknown };
					const name = typeof record.name === 'string' ? record.name.trim() : '';
					const dose = typeof record.dose === 'string' ? record.dose.trim() : '';
					return name ? [{ name, dose }] : [];
				});
			}
		} catch {
			// Older reports stored this as a single sentence.
		}
	}
	return [{ name: text, dose: '' }];
}

export function medsLabel(raw: string | null | undefined) {
	return parseMeds(raw)
		.map((med) => (med.dose ? `${med.name} · ${med.dose}` : med.name))
		.join(', ');
}

function packMeds(meds: MedEntry[]) {
	return meds.length ? JSON.stringify(meds) : '';
}

function pastDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`)) && value <= isoDate(new Date());
}

function readMeds(data: FormData): { meds: MedEntry[]; message: string } {
	const names = data.getAll('med_name').map((value) => String(value).trim());
	const doses = data.getAll('med_dose').map((value) => String(value).trim());
	const meds: MedEntry[] = [];
	for (let index = 0; index < Math.max(names.length, doses.length); index += 1) {
		const name = names[index] ?? '';
		const dose = doses[index] ?? '';
		if (!name && !dose) continue;
		meds.push({ name, dose });
	}
	if (meds.length > 12) return { meds, message: 'Add at most 12 medicines.' };
	for (const med of meds) {
		if (!med.name) return { meds, message: 'Name each medicine.' };
		if (med.name.length > 80) return { meds, message: 'Use a shorter medicine name.' };
		if (med.dose.length > 80) return { meds, message: 'Use a shorter dose.' };
	}
	return { meds, message: '' };
}

export function readSelfReport(data: FormData) {
	const kind = String(data.get('kind') ?? '').trim();
	const title = String(data.get('title') ?? '').trim();
	const occurredOn = String(data.get('occurred_on') ?? '').trim();
	const endedOn = String(data.get('ended_on') ?? '').trim();
	const location = String(data.get('location') ?? '').trim();
	const duration = String(data.get('duration') ?? '').trim();
	const severity = String(data.get('severity') ?? '').trim();
	const detail = String(data.get('detail') ?? '').trim();
	const ongoing = data.get('ongoing') === 'yes';
	const read = readMeds(data);
	const modules = reportShows(kind);
	const entered: SelfReportDraft = {
		kind,
		title,
		occurredOn,
		endedOn,
		location,
		duration,
		severity,
		meds: read.meds,
		detail,
		ongoing
	};
	if (!kindIds.has(kind)) return { ...entered, message: 'Choose what you are reporting.' };
	if (!title) return { ...entered, message: 'Name what happened.' };
	if (title.length > 120) return { ...entered, message: 'Use a shorter title.' };
	if (!pastDate(occurredOn)) {
		return { ...entered, message: modules.range ? 'Choose a start date of today or earlier.' : 'Choose today or an earlier day.' };
	}
	let storedEnded = '';
	if (modules.range && !ongoing) {
		if (!pastDate(endedOn)) return { ...entered, message: 'Choose an end date of today or earlier.' };
		if (endedOn < occurredOn) return { ...entered, message: 'End the treatment on or after the day it started.' };
		storedEnded = endedOn;
	}
	if (location.length > 160) return { ...entered, message: 'Use a shorter location.' };
	if (modules.symptom && duration.length > 80) return { ...entered, message: 'Use a shorter length.' };
	if (modules.symptom && !severities.includes(severity as (typeof severities)[number])) {
		return { ...entered, message: 'Choose how strong it felt.' };
	}
	if (read.message) return { ...entered, message: read.message };
	if (detail.length > 1000) return { ...entered, message: 'Shorten the notes.' };
	return {
		...entered,
		message: '',
		value: {
			kind,
			title,
			occurredOn,
			endedOn: storedEnded,
			location: location.slice(0, 160),
			detail,
			duration: modules.symptom ? duration.slice(0, 80) : '',
			severity: modules.symptom ? severity : '',
			meds: packMeds(read.meds),
			ongoing
		}
	};
}
