<script lang="ts">
	import VisitRecord from '#lib/components/VisitRecord.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<VisitRecord record={data.record} pid={data.patient.pid} />
