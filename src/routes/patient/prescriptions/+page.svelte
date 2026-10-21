<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const active = $derived(data.prescriptions.filter((item) => item.status === 'active'));
	const past = $derived(data.prescriptions.filter((item) => item.status !== 'active'));
	const activeCount = $derived(active.reduce((sum, order) => sum + order.items.length, 0));
</script>

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">{data.patient.pid}</p>
	<h1 class="display text-2xl font-bold">{data.patient.first_name} {data.patient.last_name}</h1>
	<p class="text-sm text-[#64748B]">{activeCount} active medications · {past.length} past orders</p>
	<p class="mt-2 text-sm">{data.patient.pharmacy_name} · {data.patient.pharmacy_address} · {data.patient.pharmacy_phone}</p>
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	<div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
		<div class="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
			<h2 class="display text-lg font-semibold">Active prescriptions</h2>
			<p class="text-sm text-[#64748B]">{activeCount}</p>
		</div>
		<div class="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_9rem] gap-4 bg-[#F8FAFC] px-4 py-2 text-[11px] font-semibold tracking-wide text-[#64748B] uppercase sm:grid">
			<p>Medication</p>
			<p>Directions</p>
			<p>Supply</p>
		</div>
		{#each active as order}
			{#each order.items as item, index}
				<div class="grid gap-1 border-t border-[#E2E8F0] px-4 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_9rem] sm:items-start sm:gap-4">
					<div class="min-w-0">
						<p class="font-semibold">{item.name}</p>
						<p class="text-sm text-[#334155]">{item.strength} {item.form}</p>
						<p class="text-xs text-[#64748B]">{order.prescriber} · {formatDate(order.ordered_at)}{#if index === 0} · {order.code}{/if}</p>
					</div>
					<div class="min-w-0">
						<p class="text-sm">{item.sig}</p>
						<p class="text-sm text-[#64748B]">{item.indication}</p>
					</div>
					<div>
						<p class="text-sm">{item.supply_label}</p>
						<p class="text-xs text-[#64748B]">{item.refills}</p>
					</div>
				</div>
			{/each}
		{:else}
			<p class="px-4 py-4 text-sm text-[#64748B]">No active prescriptions.</p>
		{/each}
	</div>

	<div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
		<h2 class="display border-b border-[#E2E8F0] px-4 py-3 text-lg font-semibold">Past prescriptions</h2>
		{#each past as order}
			<div class="flex items-start justify-between gap-3 border-t border-[#E2E8F0] px-4 py-3">
				<div class="min-w-0">
					<p class="font-semibold">{order.items.map((item) => `${item.name} ${item.strength}`).join(', ')}</p>
					<p class="text-sm text-[#64748B]">{order.code} · {formatDate(order.ordered_at)} · {order.prescriber}</p>
					<p class="text-sm">{order.course_label}</p>
				</div>
				<Badge tone="muted">{order.status}</Badge>
			</div>
		{:else}
			<p class="px-4 py-4 text-sm text-[#64748B]">No past prescriptions.</p>
		{/each}
	</div>
</section>
