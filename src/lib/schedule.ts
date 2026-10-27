import { CLINIC_DAY, formatLongDate } from './format';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const SLOT_MINUTES = 30;
export const HORIZON_DAYS = 21;

export type WindowRow = {
	kind: string;
	weekday: number;
	start_time: string;
	end_time: string;
};

export type OpenSlot = {
	kind: 'clinic' | 'home';
	startsAt: string;
	date: string;
	dateLabel: string;
	timeLabel: string;
};

export function parseClock(value: string) {
	const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
	if (!match) return null;
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour > 23 || minute > 59) return null;
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

export function formatClock(value: string) {
	const [hour, minute] = value.split(':').map(Number);
	return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
		new Date(2000, 0, 1, hour, minute)
	);
}

export function addDays(iso: string, days: number) {
	const [year, month, day] = iso.split('-').map(Number);
	const date = new Date(year, month - 1, day + days);
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function weekdayOf(iso: string) {
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(year, month - 1, day).getDay();
}

export function groupByWeekday<T extends { weekday: number }>(rows: T[]) {
	const groups: { weekday: number; rows: T[] }[] = [];
	for (const row of rows) {
		const last = groups.at(-1);
		if (last?.weekday === row.weekday) last.rows.push(row);
		else groups.push({ weekday: row.weekday, rows: [row] });
	}
	return groups;
}

export function localStamp(value: Date | string) {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) {
		return value.replace('T', ' ').slice(0, 19);
	}
	const date = value instanceof Date ? value : new Date(value);
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function clockMinutes(value: string) {
	const [hour, minute] = value.split(':').map(Number);
	return hour * 60 + minute;
}

function stampMinutes(stamp: string) {
	const [date, time] = stamp.split(' ');
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	return Date.UTC(year, month - 1, day, hour, minute) / 60000;
}

export function openSlots(
	windows: WindowRow[],
	blocks: { start: string; duration: number }[],
	from = CLINIC_DAY,
	horizonDays = HORIZON_DAYS
) {
	const slots: OpenSlot[] = [];
	for (let offset = 1; offset <= horizonDays; offset += 1) {
		const date = addDays(from, offset);
		const weekday = weekdayOf(date);
		for (const window of windows) {
			if (window.weekday !== weekday) continue;
			if (window.kind !== 'clinic' && window.kind !== 'home') continue;
			const open = clockMinutes(window.start_time);
			const close = clockMinutes(window.end_time);
			for (let minute = open; minute + SLOT_MINUTES <= close; minute += SLOT_MINUTES) {
				const hh = String(Math.floor(minute / 60)).padStart(2, '0');
				const mm = String(minute % 60).padStart(2, '0');
				const startsAt = `${date} ${hh}:${mm}:00`;
				const startAbs = stampMinutes(startsAt);
				const endAbs = startAbs + SLOT_MINUTES;
				const taken = blocks.some((block) => {
					const blockStart = stampMinutes(localStamp(block.start).slice(0, 19));
					return startAbs < blockStart + block.duration && endAbs > blockStart;
				});
				if (taken) continue;
				slots.push({
					kind: window.kind,
					startsAt,
					date,
					dateLabel: formatLongDate(date),
					timeLabel: formatClock(`${hh}:${mm}`)
				});
			}
		}
	}
	return slots;
}
