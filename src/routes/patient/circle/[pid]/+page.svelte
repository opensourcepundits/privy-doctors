<script lang="ts">
	import { enhance } from '$app/forms';
	import AccessRequests from '#lib/components/AccessRequests.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let treatmentOngoing = $state(false);
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/circle">My circle</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">{data.access.name}</h1>
	<p class="mt-1 text-sm text-[#64748B]">{data.access.pid} · You are a trustee for this chart.</p>
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	{#if form?.message}
		<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{form.message}</p>
	{/if}

	{#if data.access.view_chart}
		<article class="card">
			<p class="kicker">Consultations</p>
			{#if data.visits.length}
				<ul class="mt-3 space-y-2">
					{#each data.visits as visit (visit.id)}
						<li>
							<a class="font-semibold text-brand" href="/patient/circle/{data.access.pid}/visits/{visit.id}">{visit.label}</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-sm text-[#64748B]">No consultations are on this chart.</p>
			{/if}
		</article>
	{/if}

	{#if data.access.accept_access}
		{#if data.requests.length}
			<div class="grid gap-3">
				<AccessRequests requests={data.requests} />
			</div>
		{:else}
			<p class="text-sm text-[#64748B]">No doctor requests are waiting.</p>
		{/if}
	{/if}

	{#if data.access.add_records}
		<form class="card space-y-2" method="POST" action="?/treatment" use:enhance>
			<p class="font-semibold">Add a treatment</p>
			<p class="text-xs text-[#64748B]">It is tagged as added by you. {data.access.name} can remove it later.</p>
			<input class="field" name="title" required maxlength="120" placeholder="Treatment" />
			<label class="block text-sm font-semibold">
				Started
				<input class="field mt-1" name="occurred_on" type="date" required max={data.today} value={data.today} />
			</label>
			<label class="flex items-center gap-2 text-sm font-semibold">
				<input type="checkbox" name="ongoing" value="yes" bind:checked={treatmentOngoing} />
				It is still going on
			</label>
			{#if !treatmentOngoing}
				<label class="block text-sm font-semibold">
					Ended
					<input class="field mt-1" name="ended_on" type="date" required max={data.today} />
				</label>
			{/if}
			<label class="block text-sm font-semibold">
				Notes
				<textarea class="field mt-1" name="detail" maxlength="1000" placeholder="Anything a clinician should know"></textarea>
			</label>
			<button class="btn" type="submit">Add treatment</button>
		</form>
		<form class="card space-y-2" method="POST" action="?/scan" enctype="multipart/form-data" use:enhance>
			<p class="font-semibold">Add a scan</p>
			<input class="field" name="title" required maxlength="120" placeholder="Scan name" />
			<input class="field" name="performed_on" type="date" required max={data.today} value={data.today} />
			<input name="file" type="file" required accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf" />
			<button class="btn" type="submit">Add scan</button>
		</form>
	{/if}

	{#if !data.access.view_chart && !data.access.accept_access && !data.access.add_records}
		<p class="text-sm text-[#64748B]">No permissions are turned on for this chart.</p>
	{/if}
</section>
