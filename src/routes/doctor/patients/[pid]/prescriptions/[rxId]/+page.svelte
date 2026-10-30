<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate, liveCopy } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const order = $derived(data.prescription);
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-brand" href="/doctor/patients/{data.patient.pid}?tab=prescriptions">Prescriptions</a>
	<div class="mt-3 flex items-center justify-between">
		<h1 class="display text-2xl font-bold">#{order.code}</h1>
		<Badge>{order.status}</Badge>
	</div>
	<p class="text-sm text-[#64748B]">{data.patient.first_name} {data.patient.last_name} · {data.patient.pid}</p>
</header>

<section class="space-y-3 px-4 py-4">
	<article class="card text-sm">
		<p>{formatDate(order.ordered_at)}</p>
		{#if order.completes_on}<p>Completes {formatDate(order.completes_on)}</p>{/if}
		<p class="mt-2 font-semibold"><Mention text={order.prescriber} /></p>
		<p>{order.specialty} · NPI on file for e-sign</p>
		<p class="mt-2">{order.facility}</p>
		{#if order.pharmacy}<p>{order.pharmacy}</p>{/if}
		{#if order.course_label}<p class="mt-2 text-[#64748B]">{liveCopy(order.course_label)}</p>{/if}
	</article>
	{#each order.photos as photo}
		<a class="card block overflow-hidden" href="/files/prescriptions/{photo.id}" target="_blank" rel="noreferrer">
			<img class="max-h-80 w-full object-contain" src="/files/prescriptions/{photo.id}" alt={photo.file_name} />
			<p class="mt-2 text-xs text-[#64748B]">{photo.file_name}</p>
		</a>
	{/each}
	{#each order.items as item}
		<article class="card">
			<h2 class="font-semibold">{item.name} {item.strength}</h2>
			<p class="text-sm text-[#64748B]">{item.form} · {item.frequency}</p>
			<DoseMarks {item} />
			<p class="mt-2 text-sm">{item.sig}</p>
			<p class="mt-2 text-sm">{item.indication}</p>
			<p class="mt-2 text-xs text-[#64748B]">Dispense {item.quantity ?? '—'} · {item.supply_label} · {item.refills}</p>
			{#if item.completes_on}<p class="mt-1 text-xs text-[#64748B]">Completes {formatDate(item.completes_on)}</p>{/if}
		</article>
	{/each}
	{#if form?.sent}
		<p class="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">Renewal request transmitted.</p>
	{/if}
	<form method="POST" action="?/renew"><button class="btn" type="submit">Renew prescription</button></form>
</section>
