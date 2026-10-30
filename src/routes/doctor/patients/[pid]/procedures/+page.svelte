<script lang="ts">
	import ProcedureRecord from '#lib/components/ProcedureRecord.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ProcedureRecord item={data.item} backHref="/doctor/patients/{data.patient.pid}?tab=timeline" backLabel="Chart" />
