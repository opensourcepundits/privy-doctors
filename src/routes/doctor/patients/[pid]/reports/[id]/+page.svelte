<script lang="ts">
	import ReportRecord from '#lib/components/ReportRecord.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ReportRecord report={data.report} backHref="/doctor/patients/{data.patient.pid}?tab=timeline" backLabel="Chart" />
