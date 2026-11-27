<script lang="ts">
	import SelfReportForm from '#lib/components/SelfReportForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient">Home</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">Report something</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">File a symptom, treatment, medicine, scan, or another event. You can attach a document and tell a physician who already has access to your record.</p>
</header>

<section class="mx-4 max-w-xl py-4 lg:mx-0">
	<SelfReportForm
		today={data.today}
		message={form?.message ?? ''}
		clinicians={data.clinicians}
		attachments
		submitLabel="Add to my history"
		submitIcon="personal_injury"
		values={{
			kind: form?.kind ?? 'symptom',
			title: form?.title ?? '',
			occurredOn: form?.occurredOn ?? data.today,
			endedOn: form?.endedOn ?? '',
			location: form?.location ?? '',
			duration: form?.duration ?? '',
			severity: form?.severity ?? '',
			meds: form?.meds ?? [],
			detail: form?.detail ?? '',
			ongoing: form?.ongoing ?? false
		}}
	/>
</section>
