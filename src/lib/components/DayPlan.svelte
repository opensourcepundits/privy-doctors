<script lang="ts">
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import { dayPlan, type DoseSource } from '#lib/doses';

	let { items }: { items: DoseSource[] } = $props();
	const groups = $derived(dayPlan(items));
</script>

<div class="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-sm">
	{#each groups as group, index}
		<div class="grid grid-cols-[5.25rem_minmax(0,1fr)] {index ? 'border-t border-[#E2E8F0]' : ''}">
			<div class="border-r border-[#E2E8F0] bg-[#F8FAFC] px-2 py-3 text-right">
				<p class="text-sm font-bold tabular-nums text-[#0F172A]">{group.time}</p>
			</div>
			<div class="min-w-0">
				<p class="px-3 pt-3">
					<span class="inline-flex items-center gap-1 rounded-md border border-brand-tint bg-brand-wash px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-brand uppercase">
						<span class="material-symbols-outlined text-[14px]" aria-hidden="true">{group.icon}</span>
						{group.period}
					</span>
				</p>
				{#each group.doses as dose, doseIndex}
					<div class="px-3 py-2.5 {doseIndex ? 'border-t border-[#E2E8F0]' : ''}">
						<p class="font-semibold text-[#0F172A]">{dose.name}</p>
						{#if dose.detail}<p class="text-xs text-[#64748B]">{dose.detail}</p>{/if}
						<DoseMarks item={dose.item} />
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="px-4 py-3 text-sm text-[#64748B]">No doses to take today.</p>
	{/each}
</div>
