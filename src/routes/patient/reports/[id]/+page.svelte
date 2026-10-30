<script lang="ts">
	import { formatDate, formatTime } from '#lib/format';
	import { reportChangeLines } from '#lib/history';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const report = $derived(data.report);
	const lines = $derived(reportChangeLines(report.edits));
	const severityLabel = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' } as const;
	const severity = $derived(form?.severity ?? report.severity ?? '');
	const ongoing = $derived(form?.ongoing ?? report.ongoing);
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/history?view=reports">History</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">Edit self report</h1>
	<p class="mt-1 text-sm text-[#64748B]">Filed {formatDate(report.created_at)} · {formatTime(report.created_at)}</p>
</header>

{#if report.files.length || report.alerted.length}
	<section class="mx-4 max-w-xl pt-4 lg:mx-0">
		<article class="card space-y-2 text-sm">
			{#if report.alerted.length}
				<p>Alerted {report.alerted.join(', ')}</p>
			{/if}
			{#each report.files as file}
				<p><a class="btn-sm" href="/files/reports/{file.id}?download">{file.file_name}</a></p>
			{/each}
		</article>
	</section>
{/if}

<section class="mx-4 max-w-xl space-y-4 py-4 lg:mx-0">
	{#if data.preview}
		<article class="card text-sm">Only the patient who filed this report can change it.</article>
	{:else}
		<form class="card space-y-3" method="POST">
			{#if form?.message}
				<p class="text-sm text-red-600">{form.message}</p>
			{/if}
			<label class="block text-sm font-semibold" for="title">
				Title
				<input class="field mt-1" id="title" name="title" required maxlength="120" autocomplete="off" value={form?.title ?? report.title} />
			</label>
			<label class="block text-sm font-semibold" for="occurred-on">
				When it happened
				<input class="field mt-1" id="occurred-on" name="occurred_on" type="date" required max={data.today} value={form?.occurredOn ?? data.occurredOn} />
			</label>
			<label class="block text-sm font-semibold" for="duration">
				How long it lasted
				<input class="field mt-1" id="duration" name="duration" maxlength="80" autocomplete="off" value={form?.duration ?? report.duration ?? ''} />
			</label>
			<label class="flex items-center gap-2 text-sm font-semibold">
				<input type="checkbox" name="ongoing" value="yes" checked={ongoing} />
				It is still going on
			</label>
			<label class="block text-sm font-semibold" for="severity">
				How strong it felt
				<select class="field mt-1" id="severity" name="severity">
					<option value="" selected={severity === ''}>Not sure</option>
					{#each Object.entries(severityLabel) as [value, label]}
						<option {value} selected={severity === value}>{label}</option>
					{/each}
				</select>
			</label>
			<label class="block text-sm font-semibold" for="meds">
				Medicines taken
				<input class="field mt-1" id="meds" name="meds_taken" maxlength="240" autocomplete="off" value={form?.meds ?? report.meds_taken ?? ''} />
			</label>
			<label class="block text-sm font-semibold" for="detail">
				What you noticed
				<textarea class="field mt-1 min-h-28" id="detail" name="detail" maxlength="1000">{form?.detail ?? report.detail ?? ''}</textarea>
			</label>
			<button class="btn" type="submit">Save changes</button>
		</form>
	{/if}

	<article class="card">
		<p class="kicker">Change log</p>
		{#if lines.length}
			<ul class="mt-3 space-y-2 text-sm">
				{#each lines as line}
					<li class="border-l border-brand/30 pl-3">{line}</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">No changes have been saved yet.</p>
		{/if}
	</article>
</section>
