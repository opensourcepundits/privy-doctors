<script lang="ts">
	import { doseMarks, type DoseSource } from '#lib/doses';

	let { item }: { item: DoseSource } = $props();
	const marks = $derived(doseMarks(item));
</script>

<span class="mt-1.5 flex flex-wrap items-center gap-1.5">
	<span class="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand" title={marks.frequency}>
		<span class="material-symbols-outlined text-[16px]" aria-hidden="true">{marks.frequencyIcon}</span>
		{marks.frequency}
	</span>
	{#if marks.mealLabel}
		<span class="inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2 py-0.5 text-xs font-semibold text-white" title={marks.mealLabel}>
			{#each marks.mealIcons as icon}
				<span class="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
			{/each}
			{marks.mealLabel}
		</span>
	{/if}
</span>
