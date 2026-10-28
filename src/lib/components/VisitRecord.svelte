<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate, formatTime } from '#lib/format';
	import type { VisitRecord } from '#lib/server/clinic';

	let { record, pid }: { record: VisitRecord; pid: string } = $props();

	const modes: Record<string, string> = {
		in_person: 'In person',
		telehealth: 'Telehealth',
		follow_up: 'Follow-up'
	};
	const statusLabel = (value: string) => {
		if (value === 'in_session') return 'In progress';
		if (value === 'signed') return 'Signed';
		if (value === 'finalized') return 'Finalized';
		if (value === 'incoming') return 'Incoming';
		if (value === 'completed') return 'Completed';
		return value;
	};
	const sameNote = $derived(record.narrative.trim() && record.narrative.trim() === record.findings.trim());
	const medicines = $derived(record.orders.filter((order) => order.kind === 'medication'));
	const tests = $derived(record.orders.filter((order) => order.kind === 'test'));
	const referralOrders = $derived(record.orders.filter((order) => order.kind === 'referral'));
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href="/doctor/patients/{pid}">
		<span class="material-symbols-outlined text-base">arrow_back</span> Chart
	</a>
	<p class="kicker mt-3">{statusLabel(record.status)} · {formatDate(record.when)}{#if record.code} · {record.code}{/if}</p>
	<h1 class="display text-2xl font-bold">{record.focus}</h1>
	<p class="text-sm text-[#64748B]"><Mention text={record.doctor} />{#if record.role} · {record.role}{/if}</p>
	{#if record.practice || record.location}
		<p class="text-sm text-[#64748B]">{[record.practice, record.location].filter(Boolean).join(' · ')}</p>
	{/if}
	{#if record.modality}
		<p class="mt-1 text-sm">{modes[record.modality] ?? record.modality}</p>
	{/if}
	{#if record.continueHref}
		<a class="btn mt-4" href={record.continueHref}>Continue consultation</a>
	{/if}
</header>

<section class="space-y-3 px-4 py-4 lg:px-0">
	{#if record.findings}
		<article class="card">
			<p class="kicker">Findings</p>
			<p class="mt-2 text-sm"><Mention text={record.findings} /></p>
		</article>
	{/if}
	{#if record.plan}
		<article class="card">
			<p class="kicker">Plan</p>
			<p class="mt-2 text-sm"><Mention text={record.plan} /></p>
		</article>
	{/if}
	{#if record.narrative.trim() && !sameNote}
		<article class="card">
			<p class="kicker">Notes</p>
			<p class="mt-2 text-sm whitespace-pre-wrap"><Mention text={record.narrative} /></p>
		</article>
	{/if}
	{#if !record.findings && !record.plan && !record.narrative.trim()}
		<article class="card">
			<p class="kicker">Notes</p>
			<p class="mt-2 text-sm text-[#64748B]">No notes are filed on this consultation.</p>
		</article>
	{/if}

	<article class="card">
		<p class="kicker">Entries</p>
		{#if record.entries.length}
			<ul class="mt-3 space-y-2">
				{#each record.entries as entry}
					<li class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
						<p class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">{entry.kind}</p>
						<p class="font-semibold">{entry.label}</p>
						{#if entry.detail}<p class="text-sm text-[#64748B]">{entry.detail}</p>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">No vitals, symptoms, or observations were logged.</p>
		{/if}
	</article>

	<article class="card">
		<p class="kicker">Prescriptions</p>
		{#if record.prescriptions.length}
			<ul class="mt-3 space-y-3">
				{#each record.prescriptions as order}
					<li class="rounded-xl border border-[#E2E8F0] p-3">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-semibold">Order #{order.code}</p>
								<p class="text-xs text-[#64748B]">{formatDate(order.ordered_at)} · {formatTime(order.ordered_at)} · {order.status}{#if order.completes_on} · Completes {formatDate(order.completes_on)}{/if}</p>
							</div>
							<a class="shrink-0 text-sm font-semibold text-brand" href="/doctor/patients/{pid}/prescriptions/{order.id}">Open</a>
						</div>
						<p class="mt-2 text-sm"><Mention text={order.prescriber} />{#if order.specialty} · {order.specialty}{/if}</p>
						{#if order.facility}<p class="text-sm text-[#64748B]">{order.facility}</p>{/if}
						{#if order.pharmacy}<p class="text-sm text-[#64748B]">{order.pharmacy}</p>{/if}
						{#if order.course_label}<p class="mt-1 text-sm">{order.course_label}</p>{/if}
						<ul class="mt-2 space-y-2">
							{#each order.items as item}
								<li class="text-sm">
									<p class="font-semibold">{item.name}{item.strength ? ` ${item.strength}` : ''}</p>
									<p class="text-[#64748B]">{[item.form, item.route, item.frequency].filter(Boolean).join(' · ')}</p>
									{#if item.sig}<p>{item.sig}</p>{/if}
									{#if item.indication}<p>{item.indication}</p>{/if}
									<p class="text-xs text-[#64748B]">
										{[item.quantity != null ? `Dispense ${item.quantity}` : '', item.supply_label, item.refills, item.completes_on ? `Completes ${formatDate(item.completes_on)}` : ''].filter(Boolean).join(' · ')}
									</p>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		{:else if medicines.length}
			<ul class="mt-3 space-y-2">
				{#each medicines as order}
					<li class="rounded-xl border border-[#E2E8F0] p-3 text-sm">
						<p class="font-semibold">{order.title}</p>
						{#if order.detail}<p>{order.detail}</p>{/if}
						{#if order.note}<p class="text-[#64748B]">{order.note}</p>{/if}
						{#if order.completes_on}<p class="text-xs text-[#64748B]">Completes {formatDate(order.completes_on)}</p>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">No prescriptions were filed with this consultation.</p>
		{/if}
	</article>

	<article class="card">
		<p class="kicker">Referrals</p>
		{#if record.referrals.length}
			<ul class="mt-3 space-y-2">
				{#each record.referrals as referral}
					<li class="rounded-xl border border-[#E2E8F0] p-3 text-sm">
						<p class="font-semibold"><Mention text={referral.from_name} /> to <Mention text={referral.to_name} /></p>
						<p class="text-[#64748B]">{referral.to_specialty}{#if referral.to_credentials} · {referral.to_credentials}{/if}</p>
						<p class="mt-1">{statusLabel(referral.status)} · {formatDate(referral.created_at)} · {formatTime(referral.created_at)}</p>
						{#if referral.note}<p class="mt-1"><Mention text={referral.note} /></p>{/if}
					</li>
				{/each}
			</ul>
		{:else if referralOrders.length}
			<ul class="mt-3 space-y-2">
				{#each referralOrders as order}
					<li class="rounded-xl border border-[#E2E8F0] p-3 text-sm">
						<p class="font-semibold">{order.title}</p>
						{#if order.detail}<p>{order.detail}</p>{/if}
						{#if order.note}<p class="text-[#64748B]"><Mention text={order.note} /></p>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">No referral was made from this consultation.</p>
		{/if}
	</article>

	{#if tests.length}
		<article class="card">
			<p class="kicker">Tests ordered</p>
			<ul class="mt-3 space-y-2">
				{#each tests as order}
					<li class="text-sm">
						<p class="font-semibold">{order.title}</p>
						{#if order.detail}<p>{order.detail}</p>{/if}
						{#if order.note}<p class="text-[#64748B]">{order.note}</p>{/if}
					</li>
				{/each}
			</ul>
		</article>
	{/if}

	{#if record.tasks.length}
		<article class="card">
			<p class="kicker">Patient tasks</p>
			<ul class="mt-3 space-y-2">
				{#each record.tasks as task}
					<li class="text-sm">
						<p class="font-semibold">{task.title}</p>
						<p class="text-xs text-[#64748B] uppercase">{task.status}</p>
						{#if task.detail}<p>{task.detail}</p>{/if}
						{#if task.note}<p class="text-[#64748B]">{task.note}</p>{/if}
					</li>
				{/each}
			</ul>
		</article>
	{/if}
</section>
