<script lang="ts">
	import SignupLink from '#lib/components/SignupLink.svelte';
	import VisitRecord from '#lib/components/VisitRecord.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SignupLink class="px-4 pt-5 lg:px-0" link={data.signupLink} name={data.patient.first_name} />
<VisitRecord record={data.record} pid={data.patient.pid} />
