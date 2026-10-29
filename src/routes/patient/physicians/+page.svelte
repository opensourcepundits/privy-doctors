<script lang="ts">
	import AccessRequests from '#lib/components/AccessRequests.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/profile">Profile</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">My physicians</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		Turn a switch off to close that clinician’s view of your record. Scanning your QR code, entering your access code, or turning the switch back on opens it again.
	</p>
</header>

<section class="cards-2 px-4 py-4 lg:px-0">
	{#if form?.message}
		<p class="span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{form.message}</p>
	{/if}
	{#if data.requests.length}
		<div class="span-2 grid gap-3">
			<AccessRequests requests={data.requests} preview={data.preview} />
		</div>
	{/if}
	{#each data.physicians as doctor}
		{@const on = doctor.status === 'granted'}
		<article class="card flex items-start justify-between gap-4">
			<a class="min-w-0" href="/patient/doctors/{doctor.id}">
				<p class="font-semibold">{doctor.name}{doctor.credentials ? `, ${doctor.credentials}` : ''}</p>
				<p class="text-sm text-[#64748B]">{doctor.specialty} · {doctor.practice}</p>
				<p class="mt-2 text-sm {on ? 'text-emerald-700' : 'text-[#64748B]'}">{on ? 'Can view your full history' : 'Record access is off'}</p>
			</a>
			{#if data.preview}
				<span class="relative mt-1 h-7 w-12 shrink-0 rounded-full {on ? 'bg-brand' : 'bg-[#CBD5E1]'}" aria-hidden="true">
					<span class="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow {on ? 'left-5' : 'left-0.5'}"></span>
				</span>
			{:else}
				<form method="POST" action="?/access">
					<input type="hidden" name="doctor_id" value={doctor.id} />
					<input type="hidden" name="allow" value={on ? 'no' : 'yes'} />
					<button
						class="relative mt-1 h-7 w-12 shrink-0 rounded-full {on ? 'bg-brand' : 'bg-[#475569]'}"
						type="submit"
						role="switch"
						aria-checked={on}
						aria-label={on ? `Turn off record access for ${doctor.name}` : `Turn on record access for ${doctor.name}`}
					>
						<span class="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow {on ? 'left-5' : 'left-0.5'}"></span>
					</button>
				</form>
			{/if}
		</article>
	{:else}
		<p class="text-sm text-[#64748B]">No clinician has access yet. Your QR code and access code are on your profile.</p>
	{/each}
</section>
