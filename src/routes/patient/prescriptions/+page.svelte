<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import DayPlan from '#lib/components/DayPlan.svelte';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate, liveCopy } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let rxView = $state<'today' | 'orders'>('today');
	const active = $derived(data.prescriptions.filter((item) => item.status === 'active'));
	const activeMeds = $derived(active.flatMap((order) => order.items));
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
			<p class="text-xs text-[#64748B]">{order.code}{#if order.course_label} · {liveCopy(order.course_label)}{/if}{#if order.completes_on} · Completes {formatDate(order.completes_on)}{/if}</p>
			{#each order.items as item}
				<div class="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5">
					<p class="font-semibold">{item.name}</p>
					<p class="text-sm text-[#334155]">{item.strength} {item.form}</p>
					<DoseMarks {item} />
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
		<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
			<h2 class="display text-lg font-semibold">Active prescriptions</h2>
			<div class="flex items-center gap-2">
				<div class="flex rounded-full border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 text-xs font-semibold">
					<button class="rounded-full px-3 py-1 {rxView === 'today' ? 'bg-[#0F172A] text-white' : 'text-[#334155]'}" type="button" aria-pressed={rxView === 'today'} onclick={() => (rxView = 'today')}>Today</button>
					<button class="rounded-full px-3 py-1 {rxView === 'orders' ? 'bg-[#0F172A] text-white' : 'text-[#334155]'}" type="button" aria-pressed={rxView === 'orders'} onclick={() => (rxView = 'orders')}>Orders</button>
				</div>
				<p class="text-sm text-[#64748B]">{active.length}</p>
			</div>
		</div>
		{#if rxView === 'today'}
			<div class="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
				<p class="mb-2 text-xs text-[#334155]">Each dose is listed in the order you take it today. A medicine taken more than once appears once for each dose.</p>
				<DayPlan items={activeMeds} />
			</div>
		{:else}
			{#each active as order, index}
				{@render prescription(order, index === 0)}
			{:else}
				<p class="border-t border-[#E2E8F0] px-4 py-4 text-sm text-[#64748B]">No active prescriptions.</p>
			{/each}
		{/if}
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
