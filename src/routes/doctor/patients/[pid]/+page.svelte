<script lang="ts">
	import { page } from '$app/state';
	import TaskChecklist from '#lib/components/TaskChecklist.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Timeline from '#lib/components/Timeline.svelte';
	import { ageOn, formatDate } from '#lib/format';
	import { historyEvents, type HistorySlice, type TimelineEvent } from '#lib/history';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const tab = $derived.by(() => {
		const requested = page.url.searchParams.get('tab');
		return requested === 'checkups' ? 'consults' : (requested ?? 'timeline');
	});
	const tabs = [
		['timeline', 'Timeline'],
		['consults', 'Consults'],
		['prescriptions', 'Prescriptions'],
		['images', 'Images'],
		['labs', 'Labs'],
		['tasks', 'Tasks']
	] as const;

	let chart = $state<null | Awaited<PageProps['data']['chart']>>(null);
	let chartFailed = $state(false);
	$effect(() => {
		let on = true;
		chart = null;
		chartFailed = false;
		data.chart.then(
			(value) => {
				if (on) chart = value;
			},
			() => {
				if (on) chartFailed = true;
			}
		);
		return () => {
			on = false;
		};
	});

	const links = $derived({
		lab: (id: number) => `/doctor/patients/${data.patient.pid}/labs/${id}`,
		image: (id: number) => `/doctor/patients/${data.patient.pid}/imaging/${id}`,
		visit: (id: number) => `/doctor/patients/${data.patient.pid}/visits/${id}`,
		report: (id: number) => `/doctor/patients/${data.patient.pid}/reports/${id}`,
		procedure: (item: { year: string; name: string }) =>
			`/doctor/patients/${data.patient.pid}/procedures?year=${encodeURIComponent(item.year)}&name=${encodeURIComponent(item.name)}`
	});
	const source = $derived({
		encounters: chart?.encounters ?? [],
		reports: chart?.reports ?? [],
		labs: chart?.labs ?? [],
		imaging: chart?.imaging ?? [],
		surgeries: data.patient.surgeries
	});
	const sessionEvents = $derived.by(() => {
		if (!chart) return [];
		const loaded = chart;
		const covered = new Set(loaded.encounters.map((visit) => visit.consultation_id).filter(Boolean));
		return loaded.consultations
			.filter((consult) => !covered.has(consult.id))
			.filter((consult) => !loaded.encounters.some((visit) => visit.focus === 'Signed consultation' && consult.narrative && visit.findings === consult.narrative))
			.map((consult) => {
				const date = consult.started_at instanceof Date ? consult.started_at : new Date(consult.started_at);
				const note = (consult.narrative ?? '').trim();
				return {
					at: date.getTime(),
					day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
					year: String(date.getFullYear()),
					kind: 'Consultation',
					tone: 'bg-brand',
					title: note.split('\n')[0]?.slice(0, 80) || 'Consultation in progress',
					meta: [[consult.doctor_name, consult.credentials].filter(Boolean).join(', '), consult.status === 'in_session' ? 'In progress' : consult.status].filter(Boolean).join(' · '),
					body: '',
					note: '',
					href: `/doctor/patients/${data.patient.pid}/consults/${consult.id}`,
					link: 'Open consultation',
					image: ''
				} satisfies TimelineEvent;
			});
	});
	const chartEvents = $derived.by(() => {
		if (!chart) return [];
		const slice: HistorySlice | '' =
			tab === 'timeline' ? 'all' : tab === 'consults' ? 'consultations' : tab === 'images' ? 'images' : tab === 'labs' ? 'diagnostics' : '';
		if (!slice) return [];
		const events = historyEvents(source, slice, links);
		if (slice === 'all' || slice === 'consultations') {
			events.push(...sessionEvents);
			events.sort((a, b) => b.at - a.at);
		}
		return events;
	});
	const prescriptionEvents = $derived(
		(chart?.prescriptions ?? []).map((order) => {
			const date = order.ordered_at instanceof Date ? order.ordered_at : new Date(order.ordered_at);
			return {
				at: date.getTime(),
				day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
				year: String(date.getFullYear()),
				kind: 'Prescription',
				tone: order.status === 'completed' ? 'bg-emerald-600' : order.status === 'ceased' ? 'bg-slate-400' : 'bg-sky-700',
				title: `Order #${order.code}`,
				meta: [order.prescriber, order.specialty, order.status].filter(Boolean).join(' · '),
				body: order.items.length
					? order.items.map((item) => [item.name, item.strength].filter(Boolean).join(' ')).join(' · ')
					: order.photos.length
						? 'Photograph of the written prescription'
						: (order.course_label ?? ''),
				note: [order.facility, order.completes_on ? `Completes ${formatDate(order.completes_on)}` : ''].filter(Boolean).join(' · '),
				href: `/doctor/patients/${data.patient.pid}/prescriptions/${order.id}`,
				link: 'Open prescription',
				image: order.photos[0] ? `/files/prescriptions/${order.photos[0].id}` : ''
			} satisfies TimelineEvent;
		})
	);
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href="/doctor">
		<span class="material-symbols-outlined text-base">arrow_back</span> Schedule
	</a>
	<div class="mt-3 flex items-center gap-3">
		<div class="grid h-12 w-12 place-items-center rounded-full bg-brand font-bold text-white">
			{data.patient.first_name[0]}{data.patient.last_name[0]}
		</div>
		<div>
			<h1 class="display text-2xl font-bold">{data.patient.first_name} {data.patient.last_name}</h1>
			<p class="text-sm text-[#64748B]">{data.patient.pid} · {ageOn(data.patient.dob)}y · {data.patient.sex}{#if data.patient.blood_type} · Blood {data.patient.blood_type}{/if}{#if data.patient.nic} · NIC {data.patient.nic}{/if}{#if data.patient.passport} · Passport {data.patient.passport}{/if}</p>
		</div>
	</div>
	<a class="btn mt-4" href="/doctor/patients/{data.patient.pid}/consult">
		<span class="material-symbols-outlined text-lg">play_arrow</span>
		Start consultation
	</a>
	<p class="mt-3 text-sm">DOB {formatDate(data.patient.dob)}</p>
	{#if data.patient.allergies.length}
		<p class="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700">Critical allergies: {data.patient.allergies.join(', ')}</p>
	{/if}
</header>

<nav class="mt-4 flex gap-2 overflow-x-auto px-4 lg:px-0">
	{#each tabs as [id, label]}
		<a
			class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold {tab === id ? 'bg-brand text-white' : 'bg-white text-[#64748B]'}"
			href="?tab={id}">{label}</a>
	{/each}
</nav>

<section class="px-3 py-4 sm:px-4 lg:px-0">
	{#if tab === 'labs'}
		<form class="card mb-6 max-w-3xl space-y-2" method="POST" action="?/orderLab">
			<p class="font-semibold">Order a laboratory panel</p>
			<input class="field" name="name" placeholder="Panel name" required />
			<input class="field" name="facility" placeholder="Facility" />
			<button class="btn" type="submit">Save order</button>
		</form>
	{:else if tab === 'tasks'}
		<p class="mb-3 max-w-2xl text-sm text-[#64748B]">Tests ordered during a consultation. Each uploaded PDF stays with the consultation that created the checklist.</p>
	{/if}
	{#if chartFailed}
		<p class="text-sm text-[#64748B]">The chart could not be loaded.</p>
	{:else if !chart}
		<Skeleton count={4} />
	{:else if tab === 'timeline' || tab === 'consults' || tab === 'images' || tab === 'labs'}
		<Timeline events={chartEvents} />
	{:else if tab === 'prescriptions'}
		<Timeline events={prescriptionEvents} />
	{:else if tab === 'tasks'}
		<div class="span-2">
			<TaskChecklist tasks={chart.tasks} />
		</div>
	{/if}
	{#if tab === 'prescriptions'}
		<a class="btn mt-2 max-w-3xl" href="/doctor/patients/{data.patient.pid}/consult/orders">Create prescription order</a>
	{/if}
</section>
