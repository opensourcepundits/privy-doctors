<script lang="ts">
	import { formatDate, formatTime } from '#lib/format';
	import { reportChangeLines, type ReportEdit } from '#lib/history';
	import { parseMeds, reportKindLabel, reportShows } from '#lib/report-form';

	let {
		report,
		backHref,
		backLabel
	}: {
		report: {
			title: string;
			occurred_on: Date | string;
			created_at: Date | string;
			duration: string | null;
			ongoing: boolean;
			severity: string | null;
			meds_taken: string | null;
			kind?: string | null;
			location?: string | null;
			ended_on?: Date | string | null;
			detail: string | null;
			files: { id: number; file_name: string; content_type: string }[];
			alerted: string[];
			edits: ReportEdit[];
		};
		backHref: string;
		backLabel: string;
	} = $props();

	const modules = $derived(reportShows(report.kind, true));
	const strength = $derived(
		report.severity === 'mild' ? 'Mild' : report.severity === 'moderate' ? 'Moderate' : report.severity === 'severe' ? 'Severe' : 'Not sure'
	);
	const meds = $derived(parseMeds(report.meds_taken));
	const lines = $derived(reportChangeLines(report.edits));
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href={backHref}>
		<span class="material-symbols-outlined text-base">arrow_back</span> {backLabel}
	</a>
	<p class="kicker mt-3">{reportKindLabel(report.kind) ? `Self report · ${reportKindLabel(report.kind)}` : 'Self report'} · Filed {formatDate(report.created_at)} · {formatTime(report.created_at)}</p>
	<h1 class="display text-2xl font-bold">{report.title}</h1>
</header>

<section class="space-y-3 px-4 py-4 lg:px-0">
	<article class="card space-y-2 text-sm">
		<p><span class="text-[#64748B]">What you reported</span><br />{reportKindLabel(report.kind) || '—'}</p>
		{#if modules.range}
			<p><span class="text-[#64748B]">Started</span><br />{formatDate(report.occurred_on)}</p>
			<p><span class="text-[#64748B]">Ended</span><br />{report.ended_on ? formatDate(report.ended_on) : report.ongoing ? 'Still going on' : '—'}</p>
		{:else}
			<p><span class="text-[#64748B]">When it happened</span><br />{formatDate(report.occurred_on)}</p>
		{/if}
		<p><span class="text-[#64748B]">Where it happened</span><br />{report.location || '—'}</p>
		{#if modules.symptom}
			<p><span class="text-[#64748B]">How long it lasted</span><br />{report.duration || '—'}</p>
			<p><span class="text-[#64748B]">Still going on</span><br />{report.ongoing ? 'Yes' : 'No'}</p>
			<p><span class="text-[#64748B]">How strong it felt</span><br />{strength}</p>
		{:else if !modules.range}
			<p><span class="text-[#64748B]">Still going on</span><br />{report.ongoing ? 'Yes' : 'No'}</p>
		{/if}
		<p>
			<span class="text-[#64748B]">Medicines taken</span><br />
			{#if meds.length}
				{#each meds as med, index (med.name + index)}
					<span class="mt-1 block">{med.name}{#if med.dose} · {med.dose}{/if}</span>
				{/each}
			{:else}
				—
			{/if}
		</p>
		{#if report.detail}
			<p class="border-t border-[#E2E8F0] pt-2"><span class="text-[#64748B]">Notes</span><br />{report.detail}</p>
		{/if}
		{#if report.alerted.length}
			<p class="text-[#64748B]">Alerted {report.alerted.join(', ')}</p>
		{/if}
	</article>

	{#if report.files.length}
		<article class="card space-y-3">
			<p class="kicker">Files</p>
			{#each report.files as file (file.id)}
				{#if file.content_type.startsWith('image/')}
					<a class="block overflow-hidden rounded-xl border border-[#E2E8F0]" href="/files/reports/{file.id}" target="_blank" rel="noreferrer">
						<img class="max-h-80 w-full object-contain" src="/files/reports/{file.id}" alt={file.file_name} />
					</a>
				{/if}
				<a class="btn-sm" href="/files/reports/{file.id}?download">{file.file_name}</a>
			{/each}
		</article>
	{/if}

	<article class="card">
		<p class="kicker">Change log</p>
		{#if lines.length}
			<ul class="mt-3 space-y-2 text-sm">
				{#each lines as line, index (index)}
					<li class="border-l border-brand/30 pl-3">{line}</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">No changes have been saved yet.</p>
		{/if}
	</article>
</section>
