<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tone = 'brand', children }: { tone?: 'brand' | 'urgent' | 'warning' | 'success' | 'chronic' | 'ceased' | 'muted'; children: Snippet } = $props();
	const tones = {
		brand: 'bg-brand/12 text-brand',
		urgent: 'bg-red-500/12 text-red-600',
		warning: 'bg-amber-500/15 text-amber-700',
		success: 'bg-emerald-500/12 text-emerald-700',
		chronic: 'bg-violet-500/12 text-violet-700',
		ceased: 'bg-rose-500/12 text-rose-700',
		muted: 'bg-slate-500/12 text-slate-600'
	};
</script>

<span class="inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-[10.5px] font-medium tracking-wide uppercase {tones[tone]}">
	{@render children()}
</span>
