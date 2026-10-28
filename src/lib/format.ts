export const CLINIC_DAY = '2024-11-17';

export function asDate(value: Date | string) {
	if (value instanceof Date) return value;
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
	return new Date(value);
}

export function formatDate(value: Date | string | null | undefined) {
	if (!value) return '';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(asDate(value));
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
	}).format(asDate(value));
}

export function formatTime(value: Date | string) {
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	}).format(asDate(value));
}

export function ageOn(dob: Date | string, today = CLINIC_DAY) {
	const birth = asDate(dob);
	const now = asDate(today);
	let age = now.getFullYear() - birth.getFullYear();
	const month = now.getMonth() - birth.getMonth();
	if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
	return age;
}

export function daysUntil(value: Date | string, today = CLINIC_DAY) {
	const target = asDate(value);
	const start = asDate(today);
	target.setHours(0, 0, 0, 0);
	start.setHours(0, 0, 0, 0);
	return Math.round((target.getTime() - start.getTime()) / 86_400_000);
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
