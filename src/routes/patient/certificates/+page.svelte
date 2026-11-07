<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { certificateActive, formatDate, isoDate, restDays } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const active = $derived(data.certificates.filter((item) => certificateActive(item.rest_from, item.rest_until)));
	const others = $derived(data.certificates.filter((item) => !certificateActive(item.rest_from, item.rest_until)));
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href="/patient/profile">
		<span class="material-symbols-outlined text-base">arrow_back</span>
		Profile
	</a>
	<h1 class="display mt-3 text-2xl font-bold">My certificates</h1>
	<p class="text-sm text-[#64748B]">{data.certificates.length} {data.certificates.length === 1 ? 'certificate' : 'certificates'}</p>
</header>

<section class="space-y-3 px-4 py-4 lg:px-0">
	{#each [...active, ...others] as certificate}
		{@const current = certificateActive(certificate.rest_from, certificate.rest_until)}
		{@const days = restDays(isoDate(certificate.rest_from), isoDate(certificate.rest_until))}
		<a class="card block" href="/patient/certificates/{certificate.id}">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="font-semibold">{certificate.code || 'Medical certificate'}</p>
					<p class="mt-1 text-sm">{certificate.reason}</p>
				</div>
				<Badge tone={current ? 'success' : 'muted'}>{current ? 'Active' : 'Ended'}</Badge>
			</div>
			<p class="mt-2 text-sm text-[#64748B]">
				Certified rest {formatDate(certificate.rest_from)} – {formatDate(certificate.rest_until)}
				{#if days} · {days} {days === 1 ? 'day' : 'days'}{/if}
			</p>
			<p class="text-sm text-[#64748B]">
				Dated {formatDate(certificate.issued_on)} · <Mention text={certificate.doctor_name} />{certificate.credentials ? `, ${certificate.credentials}` : ''}
			</p>
		</a>
	{:else}
		<article class="card">
			<p class="font-semibold">No medical certificates yet</p>
			<p class="mt-1 text-sm text-[#64748B]">A certificate appears here after your doctor issues one at the end of a consultation.</p>
		</article>
	{/each}
</section>
