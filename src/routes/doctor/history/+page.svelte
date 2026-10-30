<script lang="ts">
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Clinic</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">History</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">Consultations you have finished. Open one to review the visit, or edit the prescription.</p>
</header>

<section class="px-4 py-4 lg:px-0">
	{#if data.history.length}
		<div class="grid gap-3 lg:grid-cols-2">
			{#each data.history as visit}
				<a class="card block hover:border-brand" href={visit.href}>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h2 class="font-semibold">{visit.first_name} {visit.last_name}</h2>
							<p class="text-sm text-[#64748B]">{visit.pid}{#if visit.code} · {visit.code}{/if}</p>
						</div>
						<p class="shrink-0 text-xs text-[#64748B]">{formatDate(visit.when)}</p>
					</div>
					<p class="mt-2 text-sm font-medium">{visit.title}</p>
					{#if visit.specialty}<p class="mt-1 text-sm text-[#64748B]">{visit.specialty}</p>{/if}
					<span class="btn-sm mt-3">Open consultation</span>
				</a>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-[#64748B]">No finished consultations yet.</p>
	{/if}
</section>
