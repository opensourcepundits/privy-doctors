<script lang="ts">
	import VisitRecord from '#lib/components/VisitRecord.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<VisitRecord
	record={data.record}
	pid={data.access.pid}
	portal="patient"
	backHref="/patient/circle/{data.access.pid}"
	backLabel={data.access.name}
/>
