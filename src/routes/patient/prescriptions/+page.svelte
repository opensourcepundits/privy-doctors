<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const active = $derived(data.prescriptions.filter((item) => item.status === 'active'));
	const past = $derived(data.prescriptions.filter((item) => item.status !== 'active'));
	const activeCount = $derived(active.reduce((sum, order) => sum + order.items.length, 0));

	function flag(status: string): { label: string; tone: 'brand' | 'success' | 'ceased' | 'warning' } {
		if (status === 'active') return { label: 'Ongoing', tone: 'brand' };
		if (status === 'completed') return { label: 'Completed', tone: 'success' };
		if (status === 'ceased') return { label: 'Ceased', tone: 'ceased' };
		return { label: status, tone: 'warning' };
	}
</script>

{#snippet prescription(order: (typeof data.prescriptions)[number], startOpen: boolean)}
	{@const marker = flag(order.status)}
	<details class="group border-t border-[#E2E8F0]" open={startOpen}>
		<summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
			<div class="min-w-0">
				<p class="font-semibold"><Mention text={order.prescriber} /> · {formatDate(order.ordered_at)}</p>
				<p class="truncate text-sm text-[#64748B]">{order.items.map((item) => item.name).join(', ')}</p>
			</div>
			<span class="flex shrink-0 items-center gap-2">
				<Badge tone={marker.tone}>{marker.label}</Badge>
				<span class="material-symbols-outlined text-[#64748B] transition-transform group-open:rotate-180">expand_more</span>
			</span>
		</summary>
		<div class="space-y-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
			<p class="text-xs text-[#64748B]">{order.code}{#if order.course_label} · {order.course_label}{/if}{#if order.completes_on} · Completes {formatDate(order.completes_on)}{/if}</p>
			{#each order.items as item}
				<div class="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5">
					<p class="font-semibold">{item.name}</p>
					<p class="text-sm text-[#334155]">{item.strength} {item.form}</p>
					{#if item.sig}<p class="mt-1 text-sm">{item.sig}</p>{/if}
					{#if item.indication}<p class="text-sm text-[#64748B]">{item.indication}</p>{/if}
					<p class="mt-1 text-xs text-[#64748B]">{[item.supply_label, item.refills, item.completes_on ? `Completes ${formatDate(item.completes_on)}` : ''].filter(Boolean).join(' · ')}</p>
				</div>
			{/each}
		</div>
	</details>
{/snippet}

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">{data.patient.pid}</p>
	<h1 class="display text-2xl font-bold">{data.patient.first_name} {data.patient.last_name}</h1>
	<p class="text-sm text-[#64748B]">{activeCount} active medications · {past.length} past orders</p>
	<p class="mt-2 text-sm">{data.patient.pharmacy_name} · {data.patient.pharmacy_address} · {data.patient.pharmacy_phone}</p>
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	<div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<h2 class="display text-lg font-semibold">Active prescriptions</h2>
			<p class="text-sm text-[#64748B]">{active.length}</p>
		</div>
		{#each active as order, index}
			{@render prescription(order, index === 0)}
		{:else}
			<p class="border-t border-[#E2E8F0] px-4 py-4 text-sm text-[#64748B]">No active prescriptions.</p>
		{/each}
	</div>

	<div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<h2 class="display text-lg font-semibold">Past prescriptions</h2>
			<p class="text-sm text-[#64748B]">{past.length}</p>
		</div>
		{#each past as order}
			{@render prescription(order, false)}
		{:else}
			<p class="border-t border-[#E2E8F0] px-4 py-4 text-sm text-[#64748B]">No past prescriptions.</p>
		{/each}
	</div>
</section>
