<script lang="ts">
	import { formatDate, gaugePercent } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-[#0D7377]" href="/doctor/patients/{data.patient.pid}?tab=labs">Back to labs</a>
	<p class="kicker mt-3">{formatDate(data.lab.collected_on)} · {data.patient.first_name} {data.patient.last_name}</p>
	<h1 class="display text-2xl font-bold">{data.lab.name}</h1>
	<p class="text-sm text-[#64748B]">{data.lab.facility} · {data.lab.panel_id}</p>
</header>

<section class="space-y-3 px-4 py-4">
	<article class="card text-sm">
		<p class="font-semibold">Ordering physician</p>
		<p>{data.lab.ordering_md}</p>
		<p class="mt-2 text-[#64748B]">{data.lab.specimen}</p>
		<p class="mt-3">{data.lab.note}</p>
	</article>
	{#each data.lab.results as result}
		{@const value = Number(result.value_num)}
		{@const low = Number(result.ref_low)}
		{@const high = Number(result.ref_high)}
		<article class="card">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="font-semibold">{result.name}</p>
					<p class="text-xs text-[#64748B]">{result.detail}</p>
				</div>
				<p class="text-right text-sm font-semibold text-emerald-700">{result.flag}</p>
			</div>
			<p class="display nums mt-2 text-2xl font-bold">{result.value_text ?? result.value_num} <span class="text-base font-medium text-[#64748B]">{result.unit}</span></p>
			{#if result.ref_low != null && result.ref_high != null && result.value_num != null}
				<p class="text-xs text-[#64748B]">Ref {result.ref_low} – {result.ref_high}</p>
				<div class="mt-2 h-2 rounded-full bg-[#E5EEFF]">
					<div class="h-2 rounded-full bg-[#14B8A6]" style="width: {gaugePercent(value, low, high)}%"></div>
				</div>
			{/if}
		</article>
	{/each}
	{#if form?.acknowledged || data.lab.acknowledged}
		<p class="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">Report signed and acknowledged.</p>
	{:else}
		<form method="POST" action="?/acknowledge"><button class="btn" type="submit">Sign and acknowledge report</button></form>
	{/if}
</section>
