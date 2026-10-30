export type DoseSource = {
	name: string;
	strength?: string | null;
	form?: string | null;
	frequency?: string | null;
	sig?: string | null;
	schedule_slot?: string | null;
	schedule_detail?: string | null;
	due_label?: string | null;
};

export const frequencyTags = ['Once a day', 'Twice a day', 'Three times a day', 'Four times a day', 'At bedtime'] as const;

export const mealTags = [
	'With food',
	'Before eating',
	'Without food',
	'With or without food',
	'With breakfast',
	'With lunch',
	'With dinner'
] as const;

export type DoseTag = {
	icon: string;
	label: string;
};

export type DoseMarks = {
	frequency: string;
	tags: DoseTag[];
};

export type DayGroup = {
	minutes: number;
	time: string;
	period: string;
	icon: string;
	doses: {
		name: string;
		detail: string;
		item: DoseSource;
	}[];
};

type Clock = { minutes: number; time: string; context: string };
type Slot = { minutes: number; time: string; period: string };

const CLOCK = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;

const NAMED: { word: RegExp; slot: Slot }[] = [
	{ word: /\bbreakfast\b/, slot: { minutes: 8 * 60, time: '8:00 AM', period: 'Breakfast' } },
	{ word: /\bmorning\b/, slot: { minutes: 8 * 60, time: '8:00 AM', period: 'Morning' } },
	{ word: /\blunch\b/, slot: { minutes: 12 * 60 + 30, time: '12:30 PM', period: 'Lunch' } },
	{ word: /\b(?:midday|noon)\b/, slot: { minutes: 13 * 60, time: '1:00 PM', period: 'Midday' } },
	{ word: /\bafternoon\b/, slot: { minutes: 16 * 60, time: '4:00 PM', period: 'Afternoon' } },
	{ word: /\bdinner\b/, slot: { minutes: 18 * 60, time: '6:00 PM', period: 'Dinner' } },
	{ word: /\bevening\b/, slot: { minutes: 20 * 60, time: '8:00 PM', period: 'Evening' } },
	{ word: /\b(?:bedtime|at night)\b/, slot: { minutes: 22 * 60, time: '10:00 PM', period: 'Bedtime' } }
];

const SPREAD: Record<number, Slot[]> = {
	1: [{ minutes: 8 * 60, time: '8:00 AM', period: 'Morning' }],
	2: [
		{ minutes: 8 * 60, time: '8:00 AM', period: 'Morning' },
		{ minutes: 20 * 60, time: '8:00 PM', period: 'Evening' }
	],
	3: [
		{ minutes: 8 * 60, time: '8:00 AM', period: 'Morning' },
		{ minutes: 13 * 60, time: '1:00 PM', period: 'Midday' },
		{ minutes: 20 * 60, time: '8:00 PM', period: 'Evening' }
	],
	4: [
		{ minutes: 8 * 60, time: '8:00 AM', period: 'Morning' },
		{ minutes: 12 * 60, time: '12:00 PM', period: 'Midday' },
		{ minutes: 16 * 60, time: '4:00 PM', period: 'Afternoon' },
		{ minutes: 20 * 60, time: '8:00 PM', period: 'Evening' }
	]
};

const PERIOD_ICON: Record<string, string> = {
	Breakfast: 'breakfast_dining',
	Morning: 'wb_sunny',
	Lunch: 'lunch_dining',
	Midday: 'light_mode',
	Afternoon: 'wb_twilight',
	Dinner: 'dinner_dining',
	Evening: 'dark_mode',
	Bedtime: 'bedtime'
};

const SPECIFIC: Record<string, number> = {
	Breakfast: 3,
	Lunch: 3,
	Dinner: 3,
	Bedtime: 3,
	Morning: 1,
	Midday: 1,
	Afternoon: 1,
	Evening: 1
};

function clocksIn(text: string): Clock[] {
	const found: Clock[] = [];
	for (const match of text.matchAll(CLOCK)) {
		let hour = Number(match[1]);
		const minute = Number(match[2] ?? '0');
		const pm = match[3].replace(/\./g, '').toLowerCase().startsWith('p');
		if (pm && hour < 12) hour += 12;
		if (!pm && hour === 12) hour = 0;
		const h12 = hour % 12 || 12;
		const index = match.index ?? 0;
		found.push({
			minutes: hour * 60 + minute,
			time: `${h12}:${String(minute).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`,
			context: text.slice(Math.max(0, index - 28), index + match[0].length)
		});
	}
	return found;
}

function timesPerDay(text: string) {
	const digit = text.match(/\b([2-4])\s*times\b/);
	if (digit) return Number(digit[1]);
	if (/\b(?:four times|qid)\b/.test(text)) return 4;
	if (/\b(?:three times|thrice|tid)\b/.test(text)) return 3;
	if (/\b(?:twice|two times|bid)\b/.test(text)) return 2;
	return 1;
}

function namedSlots(text: string): Slot[] {
	const byTime = new Map<number, Slot>();
	for (const entry of NAMED) {
		if (!entry.word.test(text)) continue;
		const existing = byTime.get(entry.slot.minutes);
		if (!existing || (SPECIFIC[entry.slot.period] ?? 0) > (SPECIFIC[existing.period] ?? 0)) {
			byTime.set(entry.slot.minutes, entry.slot);
		}
	}
	return [...byTime.values()].sort((a, b) => a.minutes - b.minutes);
}

function periodFromMinutes(minutes: number) {
	if (minutes < 11 * 60) return 'Morning';
	if (minutes < 14 * 60 + 30) return 'Midday';
	if (minutes < 17 * 60 + 30) return 'Afternoon';
	if (minutes < 21 * 60 + 30) return 'Evening';
	return 'Bedtime';
}

function periodFor(clock: Clock, count: number, named: Slot[]) {
	if (count === 1 && named.length === 1) return named[0].period;
	const local = namedSlots(clock.context.toLowerCase());
	if (local.length) return local[local.length - 1].period;
	return periodFromMinutes(clock.minutes);
}

function mealCues(text: string): DoseTag[] {
	if (/with or without|with\/without/.test(text)) {
		return [
			{ icon: 'restaurant', label: 'With food' },
			{ icon: 'no_meals', label: 'Or without' }
		];
	}
	if (/without food|empty stomach|on an empty/.test(text)) {
		return [{ icon: 'no_meals', label: 'Without food' }];
	}
	if (/before eating|before\b.{0,40}\bmeal|30 minutes before/.test(text)) {
		return [{ icon: 'timer', label: 'Before eating' }];
	}
	if (/\bwith breakfast\b/.test(text)) {
		return [
			{ icon: 'restaurant', label: 'With food' },
			{ icon: 'breakfast_dining', label: 'Breakfast' }
		];
	}
	if (/\bwith lunch\b/.test(text)) {
		return [
			{ icon: 'restaurant', label: 'With food' },
			{ icon: 'lunch_dining', label: 'Lunch' }
		];
	}
	if (/\bwith dinner\b/.test(text)) {
		return [
			{ icon: 'restaurant', label: 'With food' },
			{ icon: 'dinner_dining', label: 'Dinner' }
		];
	}
	if (/\bwith food\b/.test(text)) return [{ icon: 'restaurant', label: 'With food' }];
	if (/with meals|with a meal|at meals/.test(text)) return [{ icon: 'restaurant', label: 'With a meal' }];
	if (/\bbedtime\b|\bat night\b/.test(text)) return [{ icon: 'bedtime', label: 'Bedtime' }];
	return [];
}

function frequencyTagsFor(frequency: string, count: number): DoseTag[] {
	const text = frequency.toLowerCase();
	if (/\bbedtime\b|\bat night\b/.test(text)) {
		return [
			{ icon: 'today', label: 'Daily' },
			{ icon: 'bedtime', label: 'Bedtime' }
		];
	}
	const times = count <= 1 ? 'Once' : count === 2 ? 'Twice' : count === 3 ? '3 times' : '4 times';
	const cadence = /\bweek\b/.test(text) ? 'Weekly' : 'Daily';
	return [
		{ icon: 'repeat', label: times },
		{ icon: 'today', label: cadence }
	];
}

function stopsFor(item: DoseSource) {
	const bundle = [item.frequency, item.schedule_detail, item.schedule_slot, item.sig].filter(Boolean).join(' ');
	const lower = bundle.toLowerCase();
	const count = timesPerDay(lower);
	let clocks = clocksIn(item.schedule_detail ?? '');
	if (!clocks.length) clocks = clocksIn(item.due_label ?? '');
	if (!clocks.length) clocks = clocksIn(item.sig ?? '');
	const named = namedSlots(lower);

	if (clocks.length >= count) {
		return clocks.slice(0, count).map((clock) => ({
			minutes: clock.minutes,
			time: clock.time,
			period: periodFor(clock, count, named)
		}));
	}
	if (!clocks.length && (named.length === count || (count === 1 && named.length > 0))) {
		return named.slice(0, count);
	}
	if (!clocks.length) return (SPREAD[count] ?? SPREAD[1]).slice(0, count);

	const used = clocks.map((clock) => clock.minutes);
	const extra = (SPREAD[count] ?? []).filter((slot) => used.every((minutes) => Math.abs(minutes - slot.minutes) >= 45));
	return [
		...clocks.map((clock) => ({
			minutes: clock.minutes,
			time: clock.time,
			period: periodFor(clock, clocks.length, named)
		})),
		...extra
	]
		.sort((a, b) => a.minutes - b.minutes)
		.slice(0, count);
}

export function tagsFrom(value: string | null | undefined) {
	const chosen = String(value ?? '')
		.split(' · ')
		.map((part) => part.trim())
		.filter(Boolean);
	return {
		frequency: frequencyTags.find((label) => chosen.includes(label)) ?? '',
		meal: mealTags.find((label) => chosen.includes(label)) ?? ''
	};
}

export function doseMarks(item: DoseSource): DoseMarks {
	const text = [item.frequency, item.schedule_detail, item.schedule_slot, item.sig].filter(Boolean).join(' ').toLowerCase();
	const count = timesPerDay(text);
	const frequency =
		item.frequency?.trim() || (count === 1 ? 'Once a day' : count === 2 ? 'Twice a day' : `${count} times a day`);
	const tags = [...frequencyTagsFor(frequency, count)];
	for (const tag of mealCues(text)) {
		if (tags.some((existing) => existing.label === tag.label)) continue;
		tags.push(tag);
	}
	return { frequency, tags };
}

export function dayPlan(items: DoseSource[]): DayGroup[] {
	const groups: DayGroup[] = [];
	const flat = items.flatMap((item) => {
		const detail = [item.strength, item.form].filter(Boolean).join(' ');
		return stopsFor(item).map((stop) => ({ ...stop, name: item.name, detail, item }));
	});
	flat.sort((a, b) => a.minutes - b.minutes);
	for (const dose of flat) {
		const last = groups.at(-1);
		if (!last || last.minutes !== dose.minutes) {
			groups.push({
				minutes: dose.minutes,
				time: dose.time,
				period: dose.period,
				icon: PERIOD_ICON[dose.period] ?? 'schedule',
				doses: []
			});
		}
		const group = groups.at(-1);
		if (!group) continue;
		if ((SPECIFIC[dose.period] ?? 0) > (SPECIFIC[group.period] ?? 0)) {
			group.period = dose.period;
			group.icon = PERIOD_ICON[dose.period] ?? group.icon;
		}
		group.doses.push(dose);
	}
	return groups;
}
