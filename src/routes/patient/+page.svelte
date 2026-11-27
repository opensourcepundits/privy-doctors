<script lang="ts">
	import AccessRequests from '#lib/components/AccessRequests.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import DayPlan from '#lib/components/DayPlan.svelte';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { appointmentStatus, dayRelation, formatDate, formatLongDate, formatTime, initials, isoDate, liveCopy, restDays, toLive } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let rxView = $state<'today' | 'list'>('today');
	const clock = (value: Date | string) => formatTime(value).replace(/\s+/g, ' ');
	const dayParts = (value: Date | string) => {
		const date = toLive(value);
		return {
			weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
			day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
			month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
		};
	};
</script>

<header class="flex flex-col gap-4 px-4 pt-5 lg:flex-row lg:items-end lg:justify-between lg:px-0 lg:pt-6">
	<div class="flex items-center gap-3">
		<a class="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-brand font-mono text-sm font-medium text-white" href="/patient/profile" aria-label="Your profile">
			{initials(data.patient.first_name, data.patient.last_name)}
		</a>
		<div class="min-w-0">
			<p class="kicker">Patient · <span class="nums">{data.patient.pid}</span></p>
			<h1 class="display text-2xl lg:text-[1.75rem]">{data.patient.first_name} {data.patient.last_name}</h1>
		</div>
	</div>
	<div class="grid grid-cols-2 gap-2 lg:flex lg:flex-row-reverse">
		<a class="btn" href="/patient/book">
			<span class="material-symbols-outlined text-lg">calendar_month</span>
			<span class="lg:hidden">Book a visit</span><span class="hidden lg:inline">Book an appointment</span>
		</a>
		<a class="btn-line" href="/patient/report">
			<span class="material-symbols-outlined text-lg">edit_note</span>
			<span class="lg:hidden">Report</span><span class="hidden lg:inline">Report something</span>
		</a>
	</div>
</header>

{#await data.home}
	<div class="space-y-4 px-4 pt-6 lg:px-0">
		<Skeleton kind="stats" count={2} />
		<Skeleton count={3} />
	</div>
{:then home}
	{@const meds = home.active.flatMap((order) => order.items.map((item) => ({ ...item, prescriber: order.prescriber })))}
	{@const checked = home.vital ? `${clock(home.vital.recorded_at)} · ${formatDate(home.vital.recorded_at)}` : 'No reading filed'}
	{@const visits = [...home.today, ...home.upcoming]}
	{@const next = visits[0]}

	{#if home.requests.length}
		<section class="grid gap-3 px-4 pt-5 lg:px-0">
			<h2 class="display text-lg">Allow record access</h2>
			<AccessRequests requests={home.requests} preview={data.preview} />
		</section>
	{/if}

	{#if home.certificates.length}
		<section class="px-4 pt-5 lg:px-0">
			<div class="flex items-baseline justify-between gap-3 pb-2">
				<h2 class="display text-lg">Medical certificate</h2>
				<a class="text-sm font-semibold text-brand" href="/patient/certificates">My certificates</a>
			</div>
			<div class="overflow-hidden rounded-lg border border-line bg-white">
				{#each home.certificates as certificate}
					{@const days = restDays(isoDate(certificate.rest_from), isoDate(certificate.rest_until))}
					<a class="block border-b border-line px-4 py-3 last:border-b-0 hover:bg-brand-wash" href="/patient/certificates/{certificate.id}">
						<p class="kicker">Active{certificate.code ? ` · ${certificate.code}` : ''}</p>
						<p class="mt-0.5 font-semibold">{certificate.reason}</p>
						<p class="text-sm text-muted">
							Rest {formatDate(certificate.rest_from)} – {formatDate(certificate.rest_until)}{#if days} · {days} {days === 1 ? 'day' : 'days'}{/if}
						</p>
						<p class="text-sm text-muted">{certificate.doctor_name}{certificate.credentials ? `, ${certificate.credentials}` : ''} · {certificate.specialty}</p>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<div class="grid items-start gap-6 px-4 pt-5 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-0">
		<div class="grid gap-6">
			<section aria-labelledby="visit-heading">
				<h2 id="visit-heading" class="display pb-2 text-lg">{next ? 'Next visit' : 'Visits'}</h2>
				{#if next}
					{@const date = dayParts(next.starts_at)}
					{@const marker = appointmentStatus(next.status)}
					<article class="grid grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-line bg-white">
						<div class="flex flex-col items-center justify-center border-r border-line bg-brand py-4 text-white">
							<p class="font-mono text-[11px] tracking-wide uppercase opacity-80">{date.weekday}</p>
							<p class="nums text-3xl leading-tight font-medium">{date.day}</p>
							<p class="font-mono text-[11px] tracking-wide uppercase opacity-80">{date.month}</p>
						</div>
						<div class="min-w-0 px-4 py-3.5">
							<div class="flex items-start justify-between gap-3">
								<p class="kicker !text-brand">{dayRelation(next.starts_at)}</p>
								<Badge tone={marker.tone}>{marker.label}</Badge>
							</div>
							<p class="mt-0.5 text-lg font-semibold"><span class="nums">{clock(next.starts_at)}</span> · {next.duration_min} min</p>
							<p class="text-sm">{next.title}</p>
							<p class="mt-2 text-sm font-semibold"><Mention text={next.doctor_name} />, {next.credentials}</p>
							<p class="text-sm text-muted">{next.location}</p>
							{#if next.response_note}<p class="mt-1 text-sm text-muted">{next.response_note}</p>{/if}
						</div>
					</article>
					{#if visits.length > 1}
						<ol class="mt-3 overflow-hidden rounded-lg border border-line bg-white">
							{#each visits.slice(1) as visit}
								{@const marker = appointmentStatus(visit.status)}
								<li class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
									<div class="min-w-0">
										<p class="text-sm"><span class="nums">{clock(visit.starts_at)}</span> · {formatLongDate(visit.starts_at)}</p>
										<p class="truncate font-semibold">{visit.title}</p>
										<p class="text-sm text-muted"><Mention text={visit.doctor_name} />, {visit.credentials}</p>
									</div>
									<Badge tone={marker.tone}>{marker.label}</Badge>
								</li>
							{/each}
						</ol>
					{/if}
				{:else}
					<p class="rounded-lg border border-dashed border-line-strong px-4 py-5 text-sm text-muted">No visits are booked. <a class="font-semibold text-brand" href="/patient/book">Book an appointment</a></p>
				{/if}
			</section>

			<section aria-labelledby="todo-heading">
				<div class="flex items-baseline justify-between gap-3 pb-2">
					<h2 id="todo-heading" class="display text-lg">To do</h2>
					<a class="text-sm font-semibold text-brand" href="/patient/tasks">Open list</a>
				</div>
				{#if home.visitTasks.length || home.tasks.length}
					<ul class="overflow-hidden rounded-lg border border-line bg-white">
						{#each home.visitTasks as visit}
							{@const marker = appointmentStatus(visit.status)}
							<li class="border-b border-line px-4 py-3 last:border-b-0">
								<div class="flex items-start justify-between gap-3">
									<p class="font-semibold">{visit.title}</p>
									<Badge tone={marker.tone}>{marker.label}</Badge>
								</div>
								<p class="text-sm">{dayRelation(visit.starts_at)} · {formatLongDate(visit.starts_at)} · <span class="nums">{clock(visit.starts_at)}</span></p>
								<p class="text-sm text-muted"><Mention text={visit.doctor_name} /></p>
								{#if visit.status === 'accepted' || visit.status === 'confirmed' || visit.status === 'rescheduled'}
									<a class="mt-1 inline-flex text-sm font-semibold text-brand" href="/patient/tasks#visits">Reschedule</a>
								{/if}
							</li>
						{/each}
						{#each home.tasks as task}
							<li class="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
								<span class="material-symbols-outlined mt-0.5 text-xl {task.stored_name ? 'text-emerald-700' : 'text-muted'}">{task.stored_name ? 'check_box' : 'check_box_outline_blank'}</span>
								<div class="min-w-0">
									<p class="font-semibold">{task.title}</p>
									<p class="text-sm text-muted">Consultation <span class="nums">{task.consultation_uid ?? task.consultation_code}</span> · <Mention text={task.doctor_name} /></p>
									{#if task.order_uid}<p class="nums text-xs text-muted">Order {task.order_uid}</p>{/if}
									{#if task.stored_name}
										<p class="text-sm text-emerald-700">Result PDF received</p>
									{:else}
										<a class="mt-1 inline-flex text-sm font-semibold text-brand" href="/patient/tasks">Upload the result PDF</a>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted">Nothing is waiting on your list.</p>
				{/if}
			</section>

			{#if home.orders.length}
				<section aria-labelledby="tests-heading">
					<h2 id="tests-heading" class="display pb-2 text-lg">Pending tests <span class="nums text-sm font-normal text-muted">· {home.orders.length}</span></h2>
					<ul class="overflow-hidden rounded-lg border border-line bg-white">
						{#each home.orders as order}
							<li class="border-b border-line px-4 py-3 last:border-b-0">
								<p class="font-semibold">{order.title}</p>
								<p class="text-sm text-muted">Ordered by <Mention text={order.ordered_by} /> · {order.status}</p>
								{#if order.consultation_uid}<p class="nums text-xs text-muted">Consultation {order.consultation_uid}{#if order.order_uid} · Order {order.order_uid}{/if}</p>{/if}
								<p class="mt-1 text-sm">{liveCopy(order.schedule_label)}</p>
								<p class="text-sm text-[#3d4441]">{order.instructions}</p>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>

		<div class="grid gap-6">
			<a class="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-white hover:border-line-strong" href="/patient/vitals" aria-label="Vitals, last checked {checked}">
				<div class="border-r border-line px-4 py-3">
					<p class="kicker">Resting HR</p>
					<p class="nums text-2xl font-medium">{home.vital?.heart_rate ?? '—'}<span class="ml-1 text-sm text-muted">bpm</span></p>
				</div>
				<div class="px-4 py-3">
					<p class="kicker">Blood pressure</p>
					<p class="nums text-2xl font-medium">{home.vital ? `${home.vital.systolic}/${home.vital.diastolic}` : '—'}</p>
				</div>
				<p class="col-span-2 border-t border-line px-4 py-2 text-xs text-muted">Last checked <span class="nums">{checked}</span></p>
			</a>

			<section aria-labelledby="rx-heading">
				<div class="flex flex-wrap items-center justify-between gap-2 pb-2">
					<h2 id="rx-heading" class="display text-lg">Medicines <span class="nums text-sm font-normal text-muted">· {meds.length}</span></h2>
					<div class="flex items-center gap-3">
						<div class="flex rounded-md border border-line-strong bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Prescription view">
							<button class="rounded px-3 py-1 {rxView === 'today' ? 'bg-ink text-white' : 'text-muted'}" type="button" aria-pressed={rxView === 'today'} onclick={() => (rxView = 'today')}>Today</button>
							<button class="rounded px-3 py-1 {rxView === 'list' ? 'bg-ink text-white' : 'text-muted'}" type="button" aria-pressed={rxView === 'list'} onclick={() => (rxView = 'list')}>List</button>
						</div>
						<a class="text-sm font-semibold text-brand" href="/patient/prescriptions">All</a>
					</div>
				</div>
				{#if rxView === 'today'}
					<p class="mb-2 text-xs text-muted">Each dose in the order you take it today.</p>
					<DayPlan items={meds} />
				{:else}
					<div class="overflow-hidden rounded-lg border border-line bg-white">
						{#each meds as med}
							<div class="grid gap-1 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-start sm:gap-4">
								<div class="min-w-0">
									<p class="font-semibold">{med.name}</p>
									<p class="text-xs text-muted">{med.strength} · <Mention text={med.prescriber} /></p>
									<DoseMarks item={med} />
								</div>
								<p class="text-sm text-[#3d4441]">{med.schedule_detail}</p>
							</div>
						{:else}
							<p class="px-4 py-3 text-sm text-muted">No active prescriptions.</p>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	</div>
{:catch}
	<p class="px-4 pt-4 text-sm text-muted lg:px-0">The home page could not be loaded.</p>
{/await}
