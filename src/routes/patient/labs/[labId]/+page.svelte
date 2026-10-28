<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import StudyViewer from '#lib/components/StudyViewer.svelte';
	import { formatDate, gaugePercent } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/history?view=diagnostics">History</a>
	<p class="kicker mt-3">{formatDate(data.lab.collected_on)} · {data.lab.facility}</p>
	<h1 class="display text-2xl font-bold">{data.lab.name}</h1>
</header>

<section class="space-y-3 px-4 py-4 lg:px-0">
	<StudyViewer title={data.lab.name} report={data.lab.report_path} caption={data.lab.panel_id} />
	<article class="card text-sm">
		<p class="font-semibold">Ordering physician</p>
		<p><Mention text={data.lab.ordering_md} /></p>
		{#if data.lab.specimen}<p class="mt-2 text-[#64748B]">{data.lab.specimen}</p>{/if}
		{#if data.lab.note}<p class="mt-3">{data.lab.note}</p>{/if}
	</article>
	{#each data.lab.results as result}
		{@const value = Number(result.value_num)}
		{@const low = Number(result.ref_low)}
		{@const high = Number(result.ref_high)}
		<article class="card">
			<p class="font-semibold">{result.name}</p>
			<p class="display nums mt-1 text-2xl font-bold">{result.value_text ?? result.value_num} <span class="text-base font-medium text-[#64748B]">{result.unit}</span></p>
			<p class="text-sm text-emerald-700">{result.flag}</p>
			{#if result.ref_low != null && result.ref_high != null && result.value_num != null}
				<p class="text-xs text-[#64748B]">Ref {result.ref_low} – {result.ref_high}</p>
				<div class="mt-2 h-2 rounded-full bg-brand-soft">
					<div class="h-2 rounded-full bg-brand-accent" style="width: {gaugePercent(value, low, high)}%"></div>
				</div>
			{/if}
		</article>
	{/each}
</section>
