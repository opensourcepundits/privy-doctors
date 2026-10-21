<script lang="ts">
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vessels = $derived(data.study.vessels ?? []);
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-[#0D7377]" href="/patient/history">History</a>
	<p class="kicker mt-3">Clinically verified · {formatDate(data.study.performed_on)}</p>
	<h1 class="display text-2xl font-bold">{data.study.title}</h1>
	<p class="text-sm text-[#64748B]">{data.study.facility}</p>
</header>

<section class="space-y-3 px-4 py-4">
	{#if data.study.patient_quote}
		<blockquote class="card text-sm">“{data.study.patient_quote}”</blockquote>
	{/if}
	{#if data.study.calcium_score != null}
		<article class="card">
			<p class="kicker">Agatston calcium score</p>
			<p class="display nums text-4xl font-bold">{data.study.calcium_score}</p>
			<p class="text-sm">1–99 is mild. Scores under 100 are a favorable long-term outlook.</p>
		</article>
	{/if}
	{#each vessels as vessel}
		<article class="card">
			<p class="font-semibold">{vessel.name}</p>
			<p class="text-sm text-[#0D7377]">{vessel.status}</p>
			<p class="text-sm">{vessel.note}</p>
		</article>
	{/each}
	<article class="card text-sm">
		<p class="font-semibold">What this means</p>
		<p class="mt-2">{data.study.impression}</p>
		{#if data.study.outlook}<p class="mt-2">{data.study.outlook}</p>{/if}
	</article>
	<a class="btn" href="/patient/help">Message the care team about this result</a>
</section>
