<script lang="ts">
	import ClinicianView from '#lib/components/ClinicianView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="px-4 pt-5 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/book">All clinicians</a>
</div>
<ClinicianView doctor={data.profile} />
