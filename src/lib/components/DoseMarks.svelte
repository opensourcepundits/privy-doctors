<script lang="ts">
	import { doseMarks, type DoseSource } from '#lib/doses';

	let { item }: { item: DoseSource } = $props();
	const marks = $derived(doseMarks(item));
</script>

<span class="mt-1.5 flex flex-wrap items-center gap-1">
	{#each marks.tags as tag}
		<span class="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[11px] font-semibold text-[#334155]">
			<span class="material-symbols-outlined text-[14px] text-brand" aria-hidden="true">{tag.icon}</span>
			{tag.label}
		</span>
	{/each}
</span>
