<script lang="ts">
	import { ageOn, formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const views = [
		['all', 'All history'],
		['consultations', 'Consultations'],
		['diagnostics', 'Diagnostics'],
		['procedures', 'Procedures'],
		['hospital', 'Hospital visits']
	] as const;
</script>

<header class="px-4 pt-5 lg:px-0">
	<h1 class="display text-2xl font-bold">Health and medical history</h1>
	<p class="text-sm">{data.patient.first_name} {data.patient.last_name} · {ageOn(data.patient.dob)} yrs · {data.patient.pid}</p>
</header>

<nav class="mt-3 flex gap-2 overflow-x-auto px-4 lg:px-0">
	{#each views as [id, label]}
		<a class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold {data.view === id ? 'bg-[#0D7377] text-white' : 'bg-white text-[#64748B]'}" href="?view={id}">{label}</a>
	{/each}
</nav>

<section class="cards-2 px-4 py-4 lg:px-0">
	<article class="card span-2 text-sm">
		<p class="font-semibold">Clinical baseline</p>
		<p class="mt-1">Conditions: {data.patient.conditions.join(' · ') || 'None filed'}</p>
		<p>Allergies: {data.patient.allergies.join(' · ') || 'None filed'}</p>
		<p>Blood type {data.patient.blood_type}</p>
		<p>Procedures: {data.patient.surgeries.map((item) => `${item.name} ${item.year}`).join(' · ') || 'None filed'}</p>
	</article>

	{#if data.view === 'hospital'}
		<article class="card span-2">
			<p class="font-semibold">No records found</p>
			<p class="text-sm text-[#64748B]">There are no hospital admissions filed under this category.</p>
			<a class="text-sm font-semibold text-[#0D7377]" href="?view=all">Show all history</a>
		</article>
	{/if}

	{#if data.view === 'all' || data.view === 'consultations'}
		{#each data.encounters as visit}
			<article class="card">
				<p class="text-xs text-[#64748B]">{formatDate(visit.occurred_on)} · {visit.kind}</p>
				<h2 class="font-semibold">{visit.focus}</h2>
				<p class="text-sm">{visit.doctor_name}</p>
				<p class="mt-2 text-sm">{visit.findings}</p>
				<p class="text-sm text-[#64748B]">{visit.plan}</p>
			</article>
		{/each}
	{/if}
	{#if data.view === 'all' || data.view === 'diagnostics'}
		{#each data.imaging as study}
			<article class="card">
				<p class="text-xs text-[#64748B]">{formatDate(study.performed_on)} · Imaging</p>
				<h2 class="font-semibold">{study.title}</h2>
				<p class="text-sm">{study.summary}</p>
				<a class="text-sm font-semibold text-[#0D7377]" href="/patient/imaging/{study.id}">View the imaging report</a>
			</article>
		{/each}
		{#each data.labs as lab}
			<article class="card">
				<p class="text-xs text-[#64748B]">{formatDate(lab.collected_on)} · Laboratory</p>
				<h2 class="font-semibold">{lab.name}</h2>
				<p class="text-sm">{lab.note}</p>
			</article>
		{/each}
	{/if}
	{#if data.view === 'procedures'}
		{#each data.patient.surgeries as item}
			<article class="card">
				<p class="font-semibold">{item.name}</p>
				<p class="text-sm text-[#64748B]">{item.year}</p>
			</article>
		{:else}
			<p class="text-sm text-[#64748B]">No procedures are filed.</p>
		{/each}
	{/if}
</section>
