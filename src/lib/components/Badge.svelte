<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tone = 'teal', children }: { tone?: 'teal' | 'urgent' | 'warning' | 'success' | 'chronic' | 'muted'; children: Snippet } = $props();
	const tones = {
		teal: 'bg-[#0D7377]/12 text-[#0D7377]',
		urgent: 'bg-red-500/12 text-red-600',
		warning: 'bg-amber-500/15 text-amber-700',
		success: 'bg-emerald-500/12 text-emerald-700',
		chronic: 'bg-violet-500/12 text-violet-700',
		muted: 'bg-slate-500/12 text-slate-600'
	};
</script>

<span class="inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold {tones[tone]}">
	{@render children()}
</span>
