<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import StudyViewer from '#lib/components/StudyViewer.svelte';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vessels = $derived(data.study.vessels ?? []);
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-brand" href="/doctor/patients/{data.patient.pid}?tab=images">Back to images</a>
	<p class="kicker mt-3">{data.study.status} · {formatDate(data.study.performed_on)}</p>
	<h1 class="display text-2xl font-bold">{data.study.title}</h1>
	<p class="text-sm text-[#64748B]">{data.patient.first_name} {data.patient.last_name} · {data.patient.pid}</p>
</header>

<section class="space-y-3 px-4 py-4 lg:px-0">
	<StudyViewer title={data.study.title} image={data.study.image_path} report={data.study.report_path} caption={data.study.meta} />
	<article class="card text-sm">
		<p>{data.study.facility}</p>
		{#if data.study.equipment}<p class="text-[#64748B]">{data.study.equipment}</p>{/if}
		{#if data.study.radiologist}<p class="mt-2">Interpreting physician: <Mention text={data.study.radiologist} /></p>{/if}
		{#if data.study.protocol}<p>Protocol: {data.study.protocol}</p>{/if}
		<p class="mt-2">{data.study.meta}</p>
	</article>
	{#if data.study.calcium_score != null}
		<article class="card">
			<p class="kicker">Agatston calcium score</p>
			<p class="display nums text-4xl font-bold">{data.study.calcium_score}</p>
			<p class="text-sm text-[#64748B]">Mild calcification · CAD-RADS 1</p>
			<div class="mt-3 h-2 rounded-full bg-brand-soft">
				<div class="h-2 rounded-full bg-[#F59E0B]" style="width: 18%"></div>
			</div>
		</article>
	{/if}
	{#each vessels as vessel}
		<article class="card">
			<p class="font-semibold">{vessel.name}</p>
			<p class="text-sm text-brand">{vessel.status}</p>
			<p class="mt-1 text-sm">{vessel.note}</p>
		</article>
	{/each}
	<article class="card">
		<p class="font-semibold">Official impression</p>
		<p class="mt-2 text-sm whitespace-pre-wrap">{data.study.impression}</p>
	</article>
	<a class="btn" href="/patient/imaging/{data.study.id}">Open the patient explanation</a>
</section>
