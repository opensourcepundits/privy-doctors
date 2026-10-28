<script lang="ts">
	let { kind = 'cards', count = 3 }: { kind?: 'cards' | 'stats'; count?: number } = $props();
</script>

<div
	class={kind === 'stats' ? 'grid grid-cols-2 gap-3 lg:grid-cols-4' : 'grid gap-3'}
	aria-busy="true"
	aria-live="polite"
>
	<span class="sr-only">Loading</span>
	{#each Array.from({ length: count }, (_, i) => i) as i (i)}
		{#if kind === 'stats'}
			<div class="card animate-pulse space-y-3">
				<div class="h-3 w-1/3 rounded bg-[#E2E8F0]"></div>
				<div class="h-8 w-1/2 rounded bg-[#E2E8F0]"></div>
				<div class="h-3 w-2/3 rounded bg-[#E2E8F0]"></div>
			</div>
		{:else}
			<div class="card animate-pulse space-y-3">
				<div class="h-4 w-2/5 rounded bg-[#E2E8F0]"></div>
				<div class="h-3 w-4/5 rounded bg-[#E2E8F0]"></div>
				<div class="h-3 w-3/5 rounded bg-[#E2E8F0]"></div>
			</div>
		{/if}
	{/each}
</div>
