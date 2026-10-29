<script lang="ts">
	import AccessRequests from '#lib/components/AccessRequests.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import DayPlan from '#lib/components/DayPlan.svelte';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { appointmentStatus, dayRelation, formatDate, formatLongDate, formatTime, initials, liveCopy } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let rxView = $state<'today' | 'list'>('today');
</script>

<header class="px-4 pt-5 lg:px-0">
	<div class="flex items-center gap-3">
		<a class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white" href="/patient/profile" aria-label="Your profile">
			{initials(data.patient.first_name, data.patient.last_name)}
		</a>
		<div>
			<p class="kicker">Care network synced</p>
			<h1 class="display text-2xl font-bold lg:text-3xl">Good afternoon, {data.patient.first_name}</h1>
			<p class="text-sm text-[#64748B]">Patient portal · {data.patient.pid}</p>
		</div>
	</div>
</header>

<div class="flex flex-wrap gap-2 px-4 pt-4 lg:px-0">
	<a class="btn" href="/patient/book">
		<span class="material-symbols-outlined text-lg">calendar_month</span>
		Book an appointment
	</a>
	<a class="btn" href="/patient/report">
		<span class="material-symbols-outlined text-lg">personal_injury</span>
		Report something
	</a>
</div>

{#await data.home}
	<div class="space-y-4 px-4 pt-4 lg:px-0">
		<h2 class="display text-lg font-semibold">Allow record access</h2>
		<Skeleton kind="stats" count={2} />
		<h2 class="display text-lg font-semibold">Active prescriptions</h2>
		<Skeleton count={2} />
		<h2 class="display text-lg font-semibold">Tasks</h2>
		<Skeleton count={2} />
	</div>
{:then home}
	{@const meds = home.active.flatMap((order) => order.items.map((item) => ({ ...item, prescriber: order.prescriber })))}
	{@const checked = home.vital ? `${formatTime(home.vital.recorded_at)} · ${formatDate(home.vital.recorded_at)}` : 'No reading filed'}
	{@const tasksDone = home.tasks.filter((task) => task.stored_name).length}
{#if home.requests.length}
	<section class="grid gap-3 px-4 pt-4 lg:px-0">
		<h2 class="display text-lg font-semibold">Allow record access</h2>
		<AccessRequests requests={home.requests} preview={data.preview} />
	</section>
{/if}

<div class="grid items-start gap-4 px-4 pt-4 lg:grid-cols-2 lg:px-0">
<div class="grid gap-4">
<section class="grid grid-cols-2 gap-3">
	<a class="card" href="/patient/vitals">
		<p class="kicker">Resting HR</p>
		<p class="display nums text-3xl font-bold">{home.vital?.heart_rate ?? '—'} <span class="text-sm">bpm</span></p>
		<p class="mt-1 text-xs text-[#64748B]">Last checked</p>
		<p class="text-xs text-[#64748B]">{checked}</p>
	</a>
	<a class="card" href="/patient/vitals">
		<p class="kicker">Blood pressure</p>
		<p class="display nums text-3xl font-bold">{home.vital ? `${home.vital.systolic}/${home.vital.diastolic}` : '—'}</p>
		<p class="mt-1 text-xs text-[#64748B]">Last checked</p>
		<p class="text-xs text-[#64748B]">{checked}</p>
	</a>
</section>

{#if home.today.length}
	<section class="space-y-3">
		<h2 class="display text-lg font-semibold">Today</h2>
		{#each home.today as visit}
			{@const marker = appointmentStatus(visit.status)}
			<article class="card">
				<p class="kicker">{formatLongDate(visit.starts_at)}</p>
				<h2 class="display mt-1 text-xl font-bold">{formatTime(visit.starts_at)}</h2>
				<p class="text-sm">{visit.duration_min} min · {visit.title}</p>
				<p class="mt-2"><Badge tone={marker.tone}>{marker.label}</Badge></p>
				<p class="mt-2 font-semibold"><Mention text={visit.doctor_name} />, {visit.credentials}</p>
				<p class="text-sm text-[#64748B]">{visit.location}</p>
				{#if visit.response_note}<p class="mt-1 text-sm text-[#64748B]">{visit.response_note}</p>{/if}
			</article>
		{/each}
	</section>
{/if}

{#if home.upcoming.length}
	<section class="space-y-3">
		<h2 class="display text-lg font-semibold">Upcoming</h2>
		{#each home.upcoming as visit}
			{@const marker = appointmentStatus(visit.status)}
			<article class="card">
				<p class="kicker">{dayRelation(visit.starts_at)} · {formatLongDate(visit.starts_at)}</p>
				<h2 class="display mt-1 text-xl font-bold">{formatTime(visit.starts_at)}</h2>
				<p class="text-sm">{visit.duration_min} min · {visit.title}</p>
				<p class="mt-2"><Badge tone={marker.tone}>{marker.label}</Badge></p>
				<p class="mt-2 font-semibold"><Mention text={visit.doctor_name} />, {visit.credentials}</p>
				<p class="text-sm text-[#64748B]">{visit.location}</p>
				{#if visit.response_note}<p class="mt-1 text-sm text-[#64748B]">{visit.response_note}</p>{/if}
			</article>
		{/each}
	</section>
{/if}

</div>
<div class="grid content-start gap-4">
<section>
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<h2 class="display text-lg font-semibold">Active prescriptions · {meds.length}</h2>
		<div class="flex items-center gap-2">
			<div class="flex rounded-full border border-[#CBD5E1] bg-white p-0.5 text-xs font-semibold">
				<button class="rounded-full px-3 py-1 {rxView === 'today' ? 'bg-[#0F172A] text-white' : 'text-[#334155]'}" type="button" aria-pressed={rxView === 'today'} onclick={() => (rxView = 'today')}>Today</button>
				<button class="rounded-full px-3 py-1 {rxView === 'list' ? 'bg-[#0F172A] text-white' : 'text-[#334155]'}" type="button" aria-pressed={rxView === 'list'} onclick={() => (rxView = 'list')}>List</button>
			</div>
			<a class="text-sm font-semibold text-brand" href="/patient/prescriptions">View all</a>
		</div>
	</div>
	{#if rxView === 'today'}
		<p class="mb-2 text-xs text-[#334155]">Each dose is listed in the order you take it today.</p>
		<DayPlan items={meds} />
	{:else}
		<div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
			{#each meds as med, index}
				<div class="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-start sm:gap-4 {index ? 'border-t border-[#E2E8F0]' : ''}">
					<div class="min-w-0">
						<p class="font-semibold">{med.name}</p>
						<p class="text-xs text-[#64748B]">{med.strength} · <Mention text={med.prescriber} /></p>
						<DoseMarks item={med} />
					</div>
					<p class="text-sm text-[#334155]">{med.schedule_detail}</p>
				</div>
			{:else}
				<p class="px-4 py-3 text-sm text-[#64748B]">No active prescriptions.</p>
			{/each}
		</div>
	{/if}
</section>

<section>
	<div class="mb-2 flex items-center justify-between">
		<h2 class="display text-lg font-semibold">Tasks · {tasksDone} of {home.tasks.length}</h2>
		<a class="text-sm font-semibold text-brand" href="/patient/tasks">Open checklist</a>
	</div>
	<div class="space-y-3">
		{#each home.visitTasks as visit}
			{@const marker = appointmentStatus(visit.status)}
			<article class="card">
				<p class="font-semibold">{visit.title}</p>
				<p class="text-sm">{dayRelation(visit.starts_at)} · {formatLongDate(visit.starts_at)} · {formatTime(visit.starts_at)}</p>
				<p class="text-sm text-[#64748B]"><Mention text={visit.doctor_name} /></p>
				<p class="mt-2"><Badge tone={marker.tone}>{marker.label}</Badge></p>
				{#if visit.status === 'accepted' || visit.status === 'confirmed' || visit.status === 'rescheduled'}
					<a class="mt-2 inline-flex text-sm font-semibold text-brand" href="/patient/tasks#visits">Reschedule</a>
				{/if}
			</article>
		{/each}
		{#each home.tasks as task}
			<article class="card">
				<p class="font-semibold">{task.title}</p>
				<p class="text-sm text-[#64748B]">Consultation {task.consultation_uid ?? task.consultation_code} · <Mention text={task.doctor_name} /></p>
				{#if task.order_uid}<p class="text-xs text-[#64748B]">Order {task.order_uid}</p>{/if}
				<p class="text-sm {task.stored_name ? 'text-emerald-700' : ''}">{task.stored_name ? 'Result PDF received' : 'Upload the result PDF'}</p>
			</article>
		{:else}
			<p class="text-sm text-[#64748B]">No tests have been added from a consultation yet.</p>
		{/each}
	</div>
</section>

<section class="pb-5">
	<h2 class="display text-lg font-semibold">Pending tests · {home.orders.length}</h2>
	<div class="mt-2 space-y-3">
		{#each home.orders as order}
			<article class="card">
				<p class="font-semibold">{order.title}</p>
				<p class="text-sm text-[#64748B]">Ordered by <Mention text={order.ordered_by} /></p>
				{#if order.consultation_uid}<p class="text-xs text-[#64748B]">Consultation {order.consultation_uid}{#if order.order_uid} · Order {order.order_uid}{/if}</p>{/if}
				<p class="text-sm">{order.status}</p>
				<p class="text-sm">{liveCopy(order.schedule_label)}</p>
				<p class="mt-1 text-sm">{order.instructions}</p>
			</article>
		{/each}
	</div>
</section>
</div>
</div>
{:catch}
	<p class="px-4 pt-4 text-sm text-[#64748B] lg:px-0">The home page could not be loaded.</p>
{/await}
