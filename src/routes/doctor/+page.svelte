<script lang="ts">
	import BookingActions from '#lib/components/BookingActions.svelte';
	import IncomingMenu from '#lib/components/IncomingMenu.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { CLINIC_DAY, ageOn, dayRelation, formatLongDate, formatTime, initials } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const monogram = $derived(
		data.doctor.name
			.replace(/^Dr\.?\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase()
	);
</script>

<header class="px-4 pt-6 lg:px-0">
	<div class="flex items-center gap-3">
		<div class="grid h-12 w-12 place-items-center rounded-full bg-brand text-sm font-bold text-white">{monogram}</div>
		<div>
			<p class="kicker asis">careOS</p>
			<h1 class="display text-xl font-bold lg:text-3xl">{data.doctor.name}</h1>
			<p class="text-sm text-[#64748B]">{data.doctor.practice} · {data.doctor.specialty}</p>
		</div>
	</div>
	<div class="action-row mt-4">
		<IncomingMenu href="/doctor/search?intent=consult" referrals={data.incoming} />
		<a class="btn" href="/doctor/scan">
			<span class="material-symbols-outlined text-lg">qr_code_scanner</span>
			Scan QR
		</a>
	</div>
</header>

<form class="px-4 pt-4 lg:px-0" action="/doctor/search">
	<label class="relative block">
		<span class="material-symbols-outlined field-icon text-[#64748B]" aria-hidden="true">search</span>
		<input class="field field-search" name="q" placeholder="Name, PID, NIC, or passport" />
		<button class="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-brand px-3.5 text-xs font-semibold text-white" type="submit">Find</button>
	</label>
</form>

<section class="px-4 pt-6 lg:px-0">
	<div class="mb-3 flex items-end justify-between">
		<div>
			<h2 class="display text-lg font-semibold lg:text-xl">Today's patient schedule</h2>
		</div>
		<a class="text-sm font-semibold text-brand" href="/doctor/search">View all</a>
	</div>
	{#await data.schedule}
		<Skeleton count={3} />
	{:then schedule}
		{#if form?.message}<p class="mb-3 text-sm text-red-600">{form.message}</p>{/if}
		<p class="mb-3 text-sm text-[#64748B]">{formatLongDate(CLINIC_DAY)} · {schedule.appointments.length} {schedule.appointments.length === 1 ? 'visit' : 'visits'}</p>
		{#if schedule.appointments.length}
		<div class="grid gap-3 lg:grid-cols-2">
			{#each schedule.appointments as visit}
				<article class="card">
					<div class="flex gap-3">
						<div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
							{initials(visit.first_name, visit.last_name)}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<h3 class="font-semibold">{visit.first_name} {visit.last_name}, {ageOn(visit.dob)}y</h3>
								<span class="nums text-sm font-semibold text-brand">{formatTime(visit.starts_at)}</span>
							</div>
							<p class="text-sm font-medium text-[#0F172A]">{visit.title}</p>
							<p class="text-xs text-[#64748B]">{visit.pid}</p>
							<p class="mt-2 text-sm">Reason: <Mention text={visit.reason} /></p>
							<p class="text-xs text-[#64748B]"><Mention text={visit.last_visit_label} /></p>
							<a class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand" href="/doctor/patients/{visit.pid}">
								Open chart <span class="material-symbols-outlined text-base">arrow_forward</span>
							</a>
							<BookingActions id={visit.id} status={visit.status} note={visit.response_note} slots={schedule.slots} />
						</div>
					</div>
				</article>
			{/each}
		</div>
		{:else}
			<p class="text-sm text-[#64748B]">Nothing is booked for this clinic day.</p>
		{/if}
		{#if schedule.upcoming.length}
			<div class="pt-6 pb-6">
				<h2 class="display text-lg font-semibold lg:text-xl">Upcoming</h2>
				<p class="text-sm text-[#64748B]">{schedule.upcoming.length} {schedule.upcoming.length === 1 ? 'later visit' : 'later visits'}</p>
				<div class="mt-3 grid gap-3 lg:grid-cols-2">
					{#each schedule.upcoming as visit}
						<article class="card">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="font-semibold">{visit.first_name} {visit.last_name}</h3>
									<p class="text-sm font-medium">{visit.title}</p>
									<p class="text-xs text-[#64748B]">{visit.pid}</p>
								</div>
								<p class="nums text-sm font-semibold text-brand">{formatTime(visit.starts_at)}</p>
							</div>
							<p class="mt-2 text-sm">{dayRelation(visit.starts_at)} · {formatLongDate(visit.starts_at)} · {visit.duration_min} min</p>
							<p class="text-sm text-[#64748B]">{visit.location}</p>
							<p class="mt-1 text-sm">Reason: <Mention text={visit.reason} /></p>
							<BookingActions id={visit.id} status={visit.status} note={visit.response_note} slots={schedule.slots} />
						</article>
					{/each}
				</div>
			</div>
		{/if}
	{:catch}
		<p class="text-sm text-[#64748B]">The schedule could not be loaded.</p>
	{/await}
</section>
