<script lang="ts">
	import BookingActions from '#lib/components/BookingActions.svelte';
	import IncomingMenu from '#lib/components/IncomingMenu.svelte';
	import InviteColleague from '#lib/components/InviteColleague.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import { CLINIC_DAY, ageLabel, appointmentStatus, dayRelation, formatLongDate, formatTime, toLive } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const practice = $derived(
		data.doctor.practice.includes(data.doctor.specialty) ? data.doctor.practice : `${data.doctor.practice} · ${data.doctor.specialty}`
	);
	const dayParts = (value: Date | string) => {
		const date = toLive(value);
		return {
			weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
			day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
			month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
		};
	};
</script>

<header class="px-4 pt-5 lg:px-0 lg:pt-6">
	<p class="kicker">{formatLongDate(CLINIC_DAY)}</p>
	<div class="mt-1 flex flex-col gap-4">
		<div class="min-w-0">
			<h1 class="display text-2xl lg:text-[1.75rem]">{data.doctor.name}</h1>
			<p class="text-sm text-muted">{practice}</p>
		</div>
		<div class="grid gap-2 lg:flex lg:flex-wrap lg:items-stretch">
			<div class="lg:w-[16rem]">
				<IncomingMenu href="/doctor/search?intent=consult" label="Start consultation" referrals={data.incoming} />
			</div>
			<div class="grid grid-cols-2 gap-2 lg:flex [&_.btn-line]:px-2 [&_.btn-line]:text-sm [&_.btn-line]:whitespace-nowrap">
				<a class="btn-line" href="/doctor/scan">
					<span class="material-symbols-outlined text-lg">qr_code_scanner</span>
					Scan QR
				</a>
				<InviteColleague name={data.doctor.name} />
			</div>
		</div>
	</div>
</header>

<form class="px-4 pt-4 lg:px-0 lg:pt-5" action="/doctor/search" role="search">
	<label class="relative block">
		<span class="sr-only">Find a patient</span>
		<span class="material-symbols-outlined field-icon text-muted" aria-hidden="true">search</span>
		<input class="field field-search" name="q" placeholder="Name, PID, NIC, or passport" />
		<button class="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-md bg-brand px-4 text-sm font-semibold text-white" type="submit">Find</button>
	</label>
</form>

{#await data.schedule}
	<div class="px-4 pt-6 lg:px-0"><Skeleton count={3} /></div>
{:then schedule}
	<div class="grid items-start gap-6 px-4 pt-6 pb-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-0">
		<section aria-labelledby="today-heading">
			<div class="flex items-baseline justify-between gap-3 pb-2">
				<h2 id="today-heading" class="display text-lg">Today <span class="nums text-sm font-normal text-muted">· {schedule.appointments.length} {schedule.appointments.length === 1 ? 'visit' : 'visits'}</span></h2>
				<a class="text-sm font-semibold text-brand" href="/doctor/search">All patients</a>
			</div>
			{#if form?.message}<p class="mb-3 text-sm text-red-700" role="alert">{form.message}</p>{/if}
			{#if schedule.appointments.length}
				<ol class="overflow-hidden rounded-lg border border-line bg-white">
					{#each schedule.appointments as visit, index}
						{@const marker = appointmentStatus(visit.status)}
						<li class="relative grid grid-cols-[5.5rem_minmax(0,1fr)] border-b border-line last:border-b-0 {index === 0 ? 'bg-brand-wash' : ''}">
							{#if index === 0}<span class="absolute inset-y-0 left-0 w-[3px] bg-brand" aria-hidden="true"></span>{/if}
							<div class="border-r border-line px-3 py-3.5">
								<p class="nums whitespace-nowrap text-[15px] font-medium {index === 0 ? 'text-brand' : ''}">{formatTime(visit.starts_at)}</p>
								{#if index === 0}<p class="kicker mt-0.5 !text-brand">Next</p>{/if}
							</div>
							<div class="min-w-0 px-3.5 py-3.5">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<a class="font-semibold hover:underline" href="/doctor/patients/{visit.pid}">
											{visit.first_name} {visit.last_name}{#if ageLabel(visit.dob)}<span class="font-normal text-muted">, {ageLabel(visit.dob)}</span>{/if}
										</a>
										<p class="text-sm">{visit.title}</p>
										<p class="nums text-xs text-muted">{visit.pid}</p>
									</div>
									<Badge tone={marker.tone}>{marker.label}</Badge>
								</div>
								<p class="mt-1.5 text-sm text-[#3d4441]"><Mention text={visit.reason} /></p>
								<p class="text-xs text-muted"><Mention text={visit.last_visit_label} /></p>
								<div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
									<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href="/doctor/patients/{visit.pid}">
										Open chart <span class="material-symbols-outlined text-base">arrow_forward</span>
									</a>
								</div>
								{#if visit.status === 'requested'}
									<BookingActions id={visit.id} status={visit.status} note={visit.response_note} slots={schedule.slots} />
								{:else if visit.status !== 'declined' && visit.status !== 'cancelled'}
									<details class="group mt-1">
										<summary class="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted hover:text-ink">
											Booking <span class="material-symbols-outlined text-base transition-transform group-open:rotate-180">expand_more</span>
										</summary>
										<BookingActions id={visit.id} status={visit.status} note={visit.response_note} slots={schedule.slots} />
									</details>
								{:else if visit.response_note}
									<p class="mt-1 text-sm text-muted">{visit.response_note}</p>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="rounded-lg border border-dashed border-line-strong px-4 py-6 text-sm text-muted">Nothing is booked for this clinic day.</p>
			{/if}
		</section>

		<section aria-labelledby="upcoming-heading">
			<h2 id="upcoming-heading" class="display pb-2 text-lg">Upcoming <span class="nums text-sm font-normal text-muted">· {schedule.upcoming.length}</span></h2>
			{#if schedule.upcoming.length}
				<ol class="overflow-hidden rounded-lg border border-line bg-white">
					{#each schedule.upcoming as visit}
						{@const date = dayParts(visit.starts_at)}
						{@const marker = appointmentStatus(visit.status)}
						<li class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-line px-3 py-3 last:border-b-0">
							<div class="rounded-md border border-line py-1 text-center">
								<p class="kicker !text-[10px]">{date.weekday}</p>
								<p class="nums text-lg leading-tight font-medium">{date.day}</p>
								<p class="kicker !text-[10px]">{date.month}</p>
							</div>
							<div class="min-w-0">
								<div class="flex items-start justify-between gap-2">
									<p class="truncate font-semibold">{visit.first_name} {visit.last_name}</p>
									<span class="nums shrink-0 text-sm">{formatTime(visit.starts_at)}</span>
								</div>
								<p class="truncate text-sm">{visit.title}</p>
								<p class="text-xs text-muted">{dayRelation(visit.starts_at)} · {visit.duration_min} min · <Badge tone={marker.tone}>{marker.label}</Badge></p>
								<details class="group mt-1">
									<summary class="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted hover:text-ink">
										Details <span class="material-symbols-outlined text-base transition-transform group-open:rotate-180">expand_more</span>
									</summary>
									<p class="mt-1 text-sm text-muted">{visit.location}</p>
									<p class="text-sm">Reason: <Mention text={visit.reason} /></p>
									<BookingActions id={visit.id} status={visit.status} note={visit.response_note} slots={schedule.slots} />
								</details>
							</div>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="text-sm text-muted">No later visits are booked.</p>
			{/if}
		</section>
	</div>
{:catch}
	<p class="px-4 pt-6 text-sm text-muted lg:px-0">The schedule could not be loaded.</p>
{/await}
