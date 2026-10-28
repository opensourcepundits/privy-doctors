<script lang="ts">
	import ClinicianView from '#lib/components/ClinicianView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="px-4 pt-5 lg:px-0">
	{#if data.profile.id === data.doctor.id}
		<a class="text-sm font-semibold text-brand" href="/doctor/profile">Edit your profile</a>
	{/if}
</div>
<ClinicianView doctor={data.profile} />
