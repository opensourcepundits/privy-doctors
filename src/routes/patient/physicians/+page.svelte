<script lang="ts">
	import AccessRequests from '#lib/components/AccessRequests.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/profile">Profile</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">My physicians</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">These clinicians can view your full medical history.</p>
</header>

<section class="cards-2 px-4 py-4 lg:px-0">
	{#if data.requests.length}
		<div class="span-2 grid gap-3">
			<AccessRequests requests={data.requests} preview={data.preview} />
		</div>
	{/if}
	{#each data.physicians as doctor}
		<a class="card block" href="/patient/doctors/{doctor.id}">
			<p class="font-semibold">{doctor.name}{doctor.credentials ? `, ${doctor.credentials}` : ''}</p>
			<p class="text-sm text-[#64748B]">{doctor.specialty} · {doctor.practice}</p>
			<p class="mt-2 text-sm">Full record access</p>
		</a>
	{:else}
		<p class="text-sm text-[#64748B]">No clinician has access yet. Your QR code and access code are on your profile.</p>
	{/each}
</section>
