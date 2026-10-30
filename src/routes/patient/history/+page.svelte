<script lang="ts">
	import { page } from '$app/state';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Timeline from '#lib/components/Timeline.svelte';
	import { ageOn } from '#lib/format';
	import { historyEvents, type HistorySlice } from '#lib/history';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const view = $derived(page.url.searchParams.get('view') ?? 'all');
	const views = [
		['all', 'All history'],
		['consultations', 'Consultations'],
		['reports', 'Self reports'],
		['diagnostics', 'Diagnostics'],
		['images', 'Medical images'],
		['procedures', 'Procedures'],
		['hospital', 'Hospital visits']
	] as const;
</script>

<header class="px-4 pt-5 lg:px-0">
	<h1 class="display text-2xl font-bold">Health and medical history</h1>
	<p class="text-sm">{data.patient.first_name} {data.patient.last_name} · {ageOn(data.patient.dob)} yrs · {data.patient.pid}</p>
	<p class="mt-3 max-w-3xl text-sm text-[#64748B]">
		Conditions: {data.patient.conditions.join(' · ') || 'None filed'}. Allergies: {data.patient.allergies.join(' · ') || 'None filed'}. Blood type {data.patient.blood_type}.
	</p>
</header>

<nav class="mt-4 flex gap-2 overflow-x-auto px-4 lg:px-0">
	{#each views as [id, label]}
		<a class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold {view === id ? 'bg-brand text-white' : 'bg-white text-[#64748B]'}" href="?view={id}">{label}</a>
	{/each}
</nav>

<section class="px-3 py-6 sm:px-4 lg:px-0">
	{#await data.record}
		<Skeleton count={4} />
	{:then record}
		{@const events = !record || view === 'hospital'
			? []
			: historyEvents(
					{
						encounters: record.encounters,
						reports: record.reports,
						labs: record.labs,
						imaging: record.imaging,
						surgeries: data.patient.surgeries
					},
					view as HistorySlice,
					{
						lab: (id) => `/patient/labs/${id}`,
						image: (id) => `/patient/imaging/${id}`,
						visit: (id) => `/patient/visits/${id}`,
						report: (id) => `/patient/reports/${id}`,
						procedure: (item) => `/patient/history/procedures?year=${encodeURIComponent(item.year)}&name=${encodeURIComponent(item.name)}`
					}
				)}
		<Timeline {events} emptyHref={view !== 'all' ? '?view=all' : ''} />
	{:catch}
		<p class="text-sm text-[#64748B]">The history could not be loaded.</p>
	{/await}
</section>
