<script lang="ts">
	import { formatTime } from '#lib/format';

	let { startedAt }: { startedAt: Date | string } = $props();
	let now = $state(Date.now());

	$effect(() => {
		const timer = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(timer);
	});

	const elapsed = $derived.by(() => {
		const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		const seconds = total % 60;
		return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
	});
</script>

<div class="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-right">
	<p class="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">Started {formatTime(startedAt)}</p>
	<p class="nums text-lg leading-none font-bold text-[#0F172A]" aria-live="polite">{elapsed}</p>
</div>
