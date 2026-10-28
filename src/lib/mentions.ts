export type MentionDoctor = {
	id: number;
	name: string;
	credentials?: string | null;
};

export type MentionPart = {
	text: string;
	id: number | null;
};

export type MentionContext = {
	doctors: MentionDoctor[];
	portal: 'patient' | 'doctor';
	selfId: number | null;
};

function boundaryBefore(text: string, index: number) {
	if (index <= 0) return true;
	return /[^A-Za-z0-9]/.test(text[index - 1] ?? '');
}

function boundaryAfter(text: string, index: number) {
	if (index >= text.length) return true;
	return /[^A-Za-z0-9]/.test(text[index] ?? '');
}

function credentialsAlign(phrase: string, credentials: string) {
	const left = phrase.trim().toLowerCase();
	const right = credentials.trim().toLowerCase();
	if (!left || !right) return false;
	if (left === right) return true;
	if (right.startsWith(left)) {
		const next = right[left.length] ?? '';
		return next === '' || next === ',' || next === ' ';
	}
	if (left.startsWith(right)) {
		const next = left[right.length] ?? '';
		return next === '' || next === ',' || next === ' ';
	}
	return false;
}

function extendCredentials(text: string, end: number, credentials: string | null | undefined) {
	if (!credentials) return end;
	const match = text.slice(end).match(/^,\s*([^()·]+?)(?=\s*[·(]|$)/);
	if (!match) return end;
	return credentialsAlign(match[1], credentials) ? end + match[0].length : end;
}

export function splitMentions(text: string, doctors: MentionDoctor[]): MentionPart[] {
	if (!text) return [];
	const needles = doctors
		.map((doctor) => ({ id: doctor.id, name: doctor.name.trim(), credentials: doctor.credentials }))
		.filter((doctor) => doctor.name.length >= 4)
		.sort((a, b) => b.name.length - a.name.length);
	const taken: { start: number; end: number; id: number }[] = [];
	const overlaps = (start: number, end: number) => taken.some((span) => start < span.end && end > span.start);
	const lower = text.toLowerCase();
	for (const doctor of needles) {
		const needle = doctor.name.toLowerCase();
		let from = 0;
		while (from <= lower.length - needle.length) {
			const at = lower.indexOf(needle, from);
			if (at < 0) break;
			const end = at + needle.length;
			if (boundaryBefore(text, at) && boundaryAfter(text, end) && !overlaps(at, end)) {
				const extended = extendCredentials(text, end, doctor.credentials);
				if (!overlaps(at, extended)) taken.push({ start: at, end: extended, id: doctor.id });
			}
			from = at + needle.length;
		}
	}
	taken.sort((a, b) => a.start - b.start);
	const parts: MentionPart[] = [];
	let cursor = 0;
	for (const span of taken) {
		if (span.start > cursor) parts.push({ text: text.slice(cursor, span.start), id: null });
		parts.push({ text: text.slice(span.start, span.end), id: span.id });
		cursor = span.end;
	}
	if (cursor < text.length) parts.push({ text: text.slice(cursor), id: null });
	return parts;
}
