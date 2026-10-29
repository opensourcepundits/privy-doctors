export const CLINIC_DAY = '2024-11-17';

const demoMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function liveDay() {
	const now = new Date();
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function shiftDays() {
	const now = new Date();
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const seed = asDate(CLINIC_DAY);
	const anchor = Date.UTC(seed.getFullYear(), seed.getMonth(), seed.getDate());
	return Math.round((today - anchor) / 86_400_000);
}

function inDemoSpan(year: number) {
	return year >= 2020 && year <= 2025;
}

export function toLive(value: Date | string) {
	const date = asDate(value);
	if (Number.isNaN(date.getTime()) || !inDemoSpan(date.getFullYear())) return date;
	const next = new Date(date.getTime());
	next.setDate(next.getDate() + shiftDays());
	return next;
}

export function liveProcedureYear(year: string) {
	const value = Number(year);
	if (!Number.isInteger(value) || !inDemoSpan(value)) return { at: Date.UTC(value || 0, 0, 1), label: year };
	const date = new Date(value, 6, 1);
	date.setDate(date.getDate() + shiftDays());
	return { at: date.getTime(), label: String(date.getFullYear()) };
}

function shiftNamed(month: string, day: number, year: number) {
	const index = demoMonths.indexOf(month.slice(0, 3));
	if (index < 0 || !inDemoSpan(year)) return null;
	const date = new Date(year, index, day);
	date.setDate(date.getDate() + shiftDays());
	return date;
}

export function liveCopy(text: string) {
	if (!text) return '';
	const months = demoMonths.join('|');
	const dated = text.replace(
		new RegExp(`\\b(${months})[a-z]*\\.?\\s+(?:(\\d{1,2})(?:st|nd|rd|th)?,?\\s+)?(\\d{4})\\b`, 'g'),
		(match, month: string, day: string | undefined, year: string) => {
			const shifted = shiftNamed(month, day ? Number(day) : 1, Number(year));
			if (!shifted) return match;
			if (!day) return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(shifted);
			return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(shifted);
		}
	);
	return dated.replace(
		new RegExp(`\\b(${months})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!,?\\s*\\d{4})`, 'g'),
		(match, month: string, day: string) => {
			const shifted = shiftNamed(month, Number(day), 2024);
			if (!shifted) return match;
			return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(shifted);
		}
	);
}

export function asDate(value: Date | string) {
	if (value instanceof Date) return new Date(value.getTime());
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
	const wall = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
	if (wall && !/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value)) {
		return new Date(Number(wall[1]), Number(wall[2]) - 1, Number(wall[3]), Number(wall[4]), Number(wall[5]), Number(wall[6] ?? 0));
	}
	return new Date(value);
}

export function formatDate(value: Date | string | null | undefined) {
	if (!value) return '';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(toLive(value));
}

export function isoDate(value: Date | string | null | undefined) {
	if (!value) return '';
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLongDate(value: Date | string) {
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(toLive(value));
}

export function formatClinicDay(value: Date | string = CLINIC_DAY) {
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(toLive(value));
}

export function formatTime(value: Date | string) {
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	}).format(toLive(value));
}

export function ageOn(dob: Date | string, today = liveDay()) {
	const birth = asDate(dob);
	const now = asDate(today);
	let age = now.getFullYear() - birth.getFullYear();
	const month = now.getMonth() - birth.getMonth();
	if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
	return age;
}

function calendarStamp(value: Date | string) {
	const date = asDate(value);
	return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(value: Date | string, today = liveDay()) {
	return Math.round((calendarStamp(toLive(value)) - calendarStamp(toLive(today))) / 86_400_000);
}

export function dayRelation(value: Date | string, today = CLINIC_DAY) {
	const days = daysUntil(value, today);
	if (days === 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days > 1) return `In ${days} days`;
	if (days === -1) return 'Yesterday';
	return `${Math.abs(days)} days ago`;
}

export function appointmentStatus(status: string): { label: string; tone: 'brand' | 'warning' | 'success' | 'urgent' | 'muted' } {
	switch (status) {
		case 'requested':
			return { label: 'Requested', tone: 'warning' };
		case 'accepted':
		case 'confirmed':
			return { label: 'Approved', tone: 'success' };
		case 'declined':
			return { label: 'Declined', tone: 'urgent' };
		case 'rescheduled':
			return { label: 'Rescheduled', tone: 'brand' };
		case 'cancelled':
			return { label: 'Cancelled', tone: 'muted' };
		default:
			return { label: 'Scheduled', tone: 'brand' };
	}
}

export function money(value: string | number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}

export function initials(first: string, last: string) {
	return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export function fullName(first: string, last: string) {
	return `${first} ${last}`;
}

export function gaugePercent(value: number, low: number, high: number) {
	if (high <= low) return 50;
	return Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));
}
