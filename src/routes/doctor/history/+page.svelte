<script lang="ts">
	import { formatDate } from '#lib/format';
	import type { ConsultHistoryItem } from '#lib/server/clinic';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let exporting = $state('');
	let exportError = $state('');

	async function exportReport(visit: ConsultHistoryItem) {
		if (exporting) return;
		const key = `${visit.kind}-${visit.id}`;
		exporting = key;
		exportError = '';
		try {
			const response = await fetch(`/doctor/history/${visit.kind}/${visit.id}/report`);
			if (!response.ok) {
				exportError = 'The consultation report could not be exported.';
				return;
			}
			const blob = await response.blob();
			const href = URL.createObjectURL(blob);
			const link = document.createElement('a');
			const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '');
			link.href = href;
			link.download = match?.[1] || 'consultation-report.pdf';
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(href);
		} catch {
			exportError = 'The consultation report could not be exported.';
		} finally {
			exporting = '';
		}
	}
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Clinic</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">History</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">Consultations you have finished. Open one to review the visit, or export a PDF report.</p>
</header>

<section class="px-4 py-4 lg:px-0">
	{#if exportError}
		<p class="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700">{exportError}</p>
	{/if}
	{#if data.history.length}
		<div class="grid gap-3 lg:grid-cols-2">
			{#each data.history as visit}
				{@const key = `${visit.kind}-${visit.id}`}
				<article class="card hover:border-brand">
					<div class="flex items-start justify-between gap-3">
						<a class="min-w-0" href={visit.href}>
							<h2 class="font-semibold">{visit.first_name} {visit.last_name}</h2>
							<p class="text-sm text-[#64748B]">{visit.pid}{#if visit.code} · {visit.code}{/if}</p>
						</a>
						<div class="flex shrink-0 items-center gap-1">
							<p class="text-xs text-[#64748B]">{formatDate(visit.when)}</p>
							<button
								class="grid h-8 w-8 place-items-center rounded-lg border border-[#E2E8F0] bg-white text-brand hover:bg-brand-soft disabled:cursor-wait"
								type="button"
								title="Export PDF"
								aria-label="Export PDF report for {visit.first_name} {visit.last_name}"
								aria-busy={exporting === key}
								disabled={Boolean(exporting)}
								onclick={() => exportReport(visit)}
							>
								<span class="material-symbols-outlined text-[18px]" class:animate-spin={exporting === key}>
									{exporting === key ? 'progress_activity' : 'ios_share'}
								</span>
							</button>
						</div>
					</div>
					<a class="mt-2 block" href={visit.href}>
						<p class="text-sm font-medium">{visit.title}</p>
						{#if visit.specialty}<p class="mt-1 text-sm text-[#64748B]">{visit.specialty}</p>{/if}
					</a>
					<a class="btn-sm mt-3" href={visit.href}>Open consultation</a>
				</article>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-[#64748B]">No finished consultations yet.</p>
	{/if}
</section>
