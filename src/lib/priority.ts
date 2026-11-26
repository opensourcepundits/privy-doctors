export const priorities = ['Low', 'Medium', 'High'] as const;

export type Priority = (typeof priorities)[number];

const aliases: Record<string, Priority> = {
	low: 'Low',
	routine: 'Low',
	medium: 'Medium',
	urgent: 'Medium',
	high: 'High',
	stat: 'High'
};

export function priorityOf(value: string | null | undefined): Priority | null {
	const text = value?.trim().toLowerCase() ?? '';
	return aliases[text] ?? null;
}

export function priorityClass(value: string | null | undefined) {
	const priority = priorityOf(value);
	if (priority === 'High') return 'border-red-300 bg-red-50 text-red-700';
	if (priority === 'Medium') return 'border-amber-300 bg-amber-50 text-amber-900';
	if (priority === 'Low') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
	return 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]';
}

export function prioritySwatch(value: string | null | undefined) {
	const priority = priorityOf(value);
	if (priority === 'High') return 'bg-red-600';
	if (priority === 'Medium') return 'bg-amber-500';
	if (priority === 'Low') return 'bg-emerald-600';
	return 'bg-slate-300';
}
