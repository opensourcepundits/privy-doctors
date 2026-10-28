<script lang="ts">
	import AccessRequests from '#lib/components/AccessRequests.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { daysUntil, formatDate, formatLongDate, formatTime, initials } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const meds = $derived(data.active.flatMap((order) => order.items.map((item) => ({ ...item, prescriber: order.prescriber }))));
	const checked = $derived(
		data.vital ? `${formatTime(data.vital.recorded_at)} · ${formatDate(data.vital.recorded_at)}` : 'No reading filed'
	);
	const tasksDone = $derived(data.tasks.filter((task) => task.stored_name).length);
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
		<a class="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E2E8F0] bg-white text-brand" href="/patient/notifications" aria-label="Notifications">
			<span class="material-symbols-outlined">notifications</span>
		</a>
	</div>
</header>

{#if data.requests.length}
	<section class="grid gap-3 px-4 pt-4 lg:px-0">
		<h2 class="display text-lg font-semibold">Allow record access</h2>
		<AccessRequests requests={data.requests} preview={data.preview} />
	</section>
{/if}

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

<div class="grid items-start gap-4 px-4 pt-4 lg:grid-cols-2 lg:px-0">
<div class="grid gap-4">
<section class="grid grid-cols-2 gap-3">
	<a class="card" href="/patient/vitals">
		<p class="kicker">Resting HR</p>
		<p class="display nums text-3xl font-bold">{data.vital?.heart_rate ?? '—'} <span class="text-sm">bpm</span></p>
		<p class="mt-1 text-xs text-[#64748B]">Last checked</p>
		<p class="text-xs text-[#64748B]">{checked}</p>
	</a>
	<a class="card" href="/patient/vitals">
		<p class="kicker">Blood pressure</p>
		<p class="display nums text-3xl font-bold">{data.vital ? `${data.vital.systolic}/${data.vital.diastolic}` : '—'}</p>
		<p class="mt-1 text-xs text-[#64748B]">Last checked</p>
		<p class="text-xs text-[#64748B]">{checked}</p>
	</a>
</section>

{#if data.appointment}
	<section>
		<article class="card">
			<p class="kicker">Next appointment · in {daysUntil(data.appointment.starts_at)} days</p>
			<h2 class="display mt-1 text-xl font-bold">{formatLongDate(data.appointment.starts_at)}</h2>
			<p class="text-sm">{formatTime(data.appointment.starts_at)} · {data.appointment.duration_min} min</p>
			<p class="mt-2 font-semibold"><Mention text={data.appointment.doctor_name} />, {data.appointment.credentials}</p>
			<p class="text-sm text-[#64748B]">{data.appointment.location}</p>
			<p class="mt-2 text-sm">{data.appointment.title}</p>
		</article>
	</section>
{/if}

</div>
<div class="grid content-start gap-4">
<section>
	<div class="mb-2 flex items-center justify-between">
		<h2 class="display text-lg font-semibold">Active prescriptions · {meds.length}</h2>
		<a class="text-sm font-semibold text-brand" href="/patient/prescriptions">View all</a>
	</div>
	<div class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
		{#each meds as med, index}
			<div class="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-4 {index ? 'border-t border-[#E2E8F0]' : ''}">
				<div class="min-w-0">
					<p class="font-semibold">{med.name}</p>
					<p class="text-xs text-[#64748B]">{med.strength} · <Mention text={med.prescriber} /></p>
				</div>
				<p class="text-sm text-[#334155]">{med.schedule_detail}</p>
			</div>
		{:else}
			<p class="px-4 py-3 text-sm text-[#64748B]">No active prescriptions.</p>
		{/each}
	</div>
</section>

<section>
	<div class="mb-2 flex items-center justify-between">
		<h2 class="display text-lg font-semibold">Tasks · {tasksDone} of {data.tasks.length}</h2>
		<a class="text-sm font-semibold text-brand" href="/patient/tasks">Open checklist</a>
	</div>
	<div class="space-y-3">
		{#each data.tasks as task}
			<article class="card">
				<p class="font-semibold">{task.title}</p>
				<p class="text-sm text-[#64748B]">Consultation {task.consultation_code} · <Mention text={task.doctor_name} /></p>
				<p class="text-sm {task.stored_name ? 'text-emerald-700' : ''}">{task.stored_name ? 'Result PDF received' : 'Upload the result PDF'}</p>
			</article>
		{:else}
			<p class="text-sm text-[#64748B]">No tests have been added from a consultation yet.</p>
		{/each}
	</div>
</section>

<section class="pb-5">
	<h2 class="display text-lg font-semibold">Pending tests · {data.orders.length}</h2>
	<div class="mt-2 space-y-3">
		{#each data.orders as order}
			<article class="card">
				<p class="font-semibold">{order.title}</p>
				<p class="text-sm text-[#64748B]">Ordered by <Mention text={order.ordered_by} /></p>
				<p class="text-sm">{order.status}</p>
				<p class="text-sm">{order.schedule_label}</p>
				<p class="mt-1 text-sm">{order.instructions}</p>
			</article>
		{/each}
	</div>
	<article class="card mt-3">
		<p class="font-semibold">Questions or palpitations?</p>
		<p class="text-sm">The cardiology triage team is available day or night. Severe chest pain or fainting: call emergency services.</p>
		<a class="mt-2 inline-flex text-sm font-semibold text-brand" href="/patient/help">Call nurse triage</a>
	</article>
</section>
</div>
</div>
