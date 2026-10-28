<script lang="ts">
	import { ageOn, initials } from '#lib/format';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Data</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">My patients</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">Everyone who has granted you access. Open a chart to see the full history.</p>
</header>

<form class="px-4 pt-4 lg:px-0" method="GET">
	<label class="relative block lg:max-w-xl">
		<span class="material-symbols-outlined field-icon text-[#64748B]" aria-hidden="true">search</span>
		<input class="field field-search" name="q" value={data.q} placeholder="Name, PID, NIC, or passport" />
		<button class="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-brand px-3.5 text-xs font-semibold text-white" type="submit">Find</button>
	</label>
</form>

<p class="px-4 pt-3 text-sm text-[#64748B] lg:px-0">People who have granted you access</p>

{#await data.patients}
	<div class="px-4 py-4 lg:px-0"><Skeleton count={4} /></div>
{:then patients}
	<p class="px-4 text-sm text-[#64748B] lg:px-0">{patients.length} {patients.length === 1 ? 'patient' : 'patients'}</p>
	<section class="cards-2 px-4 py-4 lg:px-0">
		{#each patients as patient}
			<a class="card block" href="/doctor/patients/{patient.pid}">
				<div class="flex items-center gap-3">
					<div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand">
						{initials(patient.first_name, patient.last_name)}
					</div>
					<div class="min-w-0">
						<p class="font-semibold">{patient.first_name} {patient.last_name}</p>
						<p class="text-sm text-[#64748B]">{ageOn(patient.dob)}y · {patient.sex} · {patient.pid}</p>
					</div>
				</div>
				{#if patient.conditions.length}
					<p class="mt-3 line-clamp-2 text-sm text-[#64748B]">{patient.conditions.join(' · ')}</p>
				{/if}
				<p class="mt-3 text-sm font-semibold text-brand">Open chart</p>
			</a>
		{:else}
			<p class="text-sm text-[#64748B]">
				{data.q ? 'No patients match that search.' : 'No patients are on your list yet. They appear here once access is granted.'}
			</p>
		{/each}
	</section>
{:catch}
	<p class="px-4 py-4 text-sm text-[#64748B] lg:px-0">The patient list could not be loaded.</p>
{/await}
