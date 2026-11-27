<script lang="ts">
	import ReportRecord from '#lib/components/ReportRecord.svelte';
	import SelfReportForm from '#lib/components/SelfReportForm.svelte';
	import { isoDate } from '#lib/format';
	import { parseMeds } from '#lib/report-form';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const report = $derived(data.report);
</script>

<ReportRecord report={report} backHref="/patient/history?view=reports" backLabel="History" />

{#if report.added_by}
	<section class="mx-4 max-w-xl pb-2 lg:mx-0">
		<p class="text-sm text-[#64748B]">Added by {report.added_by}</p>
		{#if !data.preview}
			<form method="POST" action="?/remove">
				<button class="btn-line mt-2" type="submit">Remove</button>
			</form>
		{/if}
	</section>
{/if}

{#if !data.preview}
	<section class="mx-4 max-w-xl space-y-4 pb-6 lg:mx-0">
		{#key report.id}
			<SelfReportForm
				today={data.today}
				message={form?.message ?? ''}
				kicker="Edit this report"
				submitLabel="Save changes"
				values={{
					kind: form?.kind ?? report.kind ?? '',
					title: form?.title ?? report.title,
					occurredOn: form?.occurredOn ?? isoDate(report.occurred_on),
					endedOn: form?.endedOn ?? isoDate(report.ended_on),
					location: form?.location ?? report.location ?? '',
					duration: form?.duration ?? report.duration ?? '',
					severity: form?.severity ?? report.severity ?? '',
					meds: form?.meds ?? parseMeds(report.meds_taken),
					detail: form?.detail ?? report.detail ?? '',
					ongoing: form?.ongoing ?? report.ongoing
				}}
			/>
		{/key}
	</section>
{/if}
