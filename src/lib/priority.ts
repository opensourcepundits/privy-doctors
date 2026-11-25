export const priorities = ['Routine', 'Urgent', 'STAT'] as const;

export type Priority = (typeof priorities)[number];

export function priorityOf(value: string | null | undefined): Priority | null {
	const text = value?.trim().toLowerCase() ?? '';
	return priorities.find((item) => item.toLowerCase() === text) ?? null;
}

export function priorityClass(value: string | null | undefined) {
	const priority = priorityOf(value);
	if (priority === 'STAT') return 'border-red-200 bg-red-50 text-red-700';
	if (priority === 'Urgent') return 'border-amber-200 bg-amber-50 text-amber-800';
	if (priority === 'Routine') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	return 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]';
}
