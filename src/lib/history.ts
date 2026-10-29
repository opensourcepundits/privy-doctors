import { formatDate, formatTime, liveProcedureYear, toLive } from '#lib/format';

export type TimelineEvent = {
	at: number;
	day: string;
	year: string;
	kind: string;
	tone: string;
	title: string;
	meta: string;
	body: string;
	note: string;
	href: string;
	link: string;
	image: string;
	log?: string[];
};

type Encounter = {
	id: number;
	occurred_on: Date | string;
	focus: string | null;
	doctor_name: string | null;
	kind: string | null;
	findings: string | null;
	plan: string | null;
};

export type ReportChange = { field: string; from: string; to: string };

export type ReportEdit = {
	changed_at: Date | string;
	changes: ReportChange[];
};

type Report = {
	id: number;
	occurred_on: Date | string;
	severity: string | null;
	duration: string | null;
	ongoing: boolean;
	title: string;
	detail: string | null;
	meds_taken: string | null;
	edits?: ReportEdit[];
};

const reportFields: Record<string, string> = {
	title: 'Title',
	occurred_on: 'When it happened',
	duration: 'How long it lasted',
	severity: 'How strong it felt',
	meds_taken: 'Medicines taken',
	ongoing: 'Still going on',
	detail: 'What you noticed'
};

function reportValue(field: string, value: string) {
	if (field === 'ongoing') return value === 'true' ? 'Yes' : 'No';
	if (field === 'severity') return value === 'mild' ? 'Mild' : value === 'moderate' ? 'Moderate' : value === 'severe' ? 'Severe' : 'Not sure';
	if (field === 'occurred_on' && value) return formatDate(value);
	return value || 'empty';
}

export function reportChangeLines(edits: ReportEdit[] | undefined) {
	return (edits ?? []).map((edit) => {
		const when = `${formatDate(edit.changed_at)} · ${formatTime(edit.changed_at)}`;
		const bits = (edit.changes ?? []).map((change) => `${reportFields[change.field] ?? change.field}: ${reportValue(change.field, change.from)} → ${reportValue(change.field, change.to)}`);
		return `${when} — ${bits.join('; ')}`;
	});
}

type Lab = {
	id: number;
	collected_on: Date | string | null;
	name: string;
	facility: string | null;
	ordering_md: string | null;
	note: string | null;
};

type Study = {
	id: number;
	performed_on: Date | string | null;
	modality: string | null;
	title: string;
	facility: string | null;
	summary: string | null;
	image_path: string | null;
};

type Surgery = { year: string; name: string };

export type HistorySource = {
	encounters: Encounter[];
	reports: Report[];
	labs: Lab[];
	imaging: Study[];
	surgeries: Surgery[];
};

export type HistorySlice = 'all' | 'consultations' | 'reports' | 'diagnostics' | 'images' | 'procedures';

const parts: Record<HistorySlice, Array<'consultations' | 'reports' | 'diagnostics' | 'images' | 'procedures'>> = {
	all: ['consultations', 'reports', 'diagnostics', 'images', 'procedures'],
	consultations: ['consultations'],
	reports: ['reports'],
	diagnostics: ['diagnostics'],
	images: ['images'],
	procedures: ['procedures']
};

function stamped(value: Date | string) {
	const date = toLive(value);
	return {
		at: date.getTime(),
		day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
		year: String(date.getFullYear())
	};
}

export function historyEvents(
	source: HistorySource,
	slice: HistorySlice,
	links: { lab: (id: number) => string; image: (id: number) => string; visit?: (id: number) => string; report?: (id: number) => string }
) {
	const include = new Set(parts[slice]);
	const items: TimelineEvent[] = [];
	if (include.has('consultations')) {
		for (const visit of source.encounters ?? []) {
			items.push({
				...stamped(visit.occurred_on),
				kind: 'Consultation',
				tone: 'bg-brand',
				title: visit.focus ?? 'Consultation',
				meta: [visit.doctor_name, visit.kind].filter(Boolean).join(' · '),
				body: visit.findings ?? '',
				note: visit.plan ?? '',
				href: links.visit ? links.visit(visit.id) : '',
				link: links.visit ? 'Open consultation' : '',
				image: ''
			});
		}
	}
	if (include.has('reports')) {
		for (const report of source.reports ?? []) {
			const when = stamped(report.occurred_on);
			const strength = report.severity === 'mild' ? 'Mild' : report.severity === 'moderate' ? 'Moderate' : report.severity === 'severe' ? 'Severe' : '';
			items.push({
				...when,
				at: when.at + report.id,
				kind: 'Self report',
				tone: 'bg-rose-600',
				title: report.title,
				meta: [strength, report.duration, report.ongoing ? 'Still going on' : ''].filter(Boolean).join(' · ') || 'Filed by the patient',
				body: report.detail ?? '',
				note: report.meds_taken ? `Medicines taken: ${report.meds_taken}` : '',
				href: links.report ? links.report(report.id) : '',
				link: links.report ? 'Edit report' : '',
				image: '',
				log: reportChangeLines(report.edits)
			});
		}
	}
	if (include.has('diagnostics')) {
		for (const lab of source.labs ?? []) {
			const when = lab.collected_on ? stamped(lab.collected_on) : { at: 0, day: 'Pending', year: '' };
			items.push({
				...when,
				kind: 'Laboratory',
				tone: 'bg-emerald-600',
				title: lab.name,
				meta: [lab.facility, lab.ordering_md].filter(Boolean).join(' · '),
				body: lab.note ?? '',
				note: '',
				href: links.lab(lab.id),
				link: 'View the lab report',
				image: ''
			});
		}
	}
	if (include.has('images')) {
		for (const study of source.imaging ?? []) {
			const when = study.performed_on ? stamped(study.performed_on) : { at: 0, day: 'Pending', year: '' };
			items.push({
				...when,
				kind: study.modality || 'Imaging',
				tone: 'bg-violet-600',
				title: study.title,
				meta: study.facility ?? '',
				body: study.summary ?? '',
				note: '',
				href: links.image(study.id),
				link: 'View the scan',
				image: study.image_path ?? ''
			});
		}
	}
	if (include.has('procedures')) {
		for (const item of source.surgeries ?? []) {
			const shifted = liveProcedureYear(item.year);
			items.push({
				at: shifted.at,
				day: shifted.label,
				year: '',
				kind: 'Procedure',
				tone: 'bg-amber-600',
				title: item.name,
				meta: 'Procedure on file',
				body: '',
				note: '',
				href: '',
				link: '',
				image: ''
			});
		}
	}
	return items.sort((a, b) => b.at - a.at);
}
