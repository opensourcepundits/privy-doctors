<script lang="ts">
	import MedicalCertificate from '#lib/components/MedicalCertificate.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MedicalCertificate certificate={data.certificate} backHref={data.backHref} backLabel={data.backLabel} />
