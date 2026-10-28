<script lang="ts">
	import TaskChecklist from '#lib/components/TaskChecklist.svelte';
	import Timeline from '#lib/components/Timeline.svelte';
	import { ageOn, formatDate } from '#lib/format';
	import { historyEvents, type HistorySlice, type TimelineEvent } from '#lib/history';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const tabs = [
		['timeline', 'Timeline'],
		['consults', 'Consults'],
		['prescriptions', 'Prescriptions'],
		['images', 'Images'],
		['labs', 'Labs'],
		['tasks', 'Tasks']
	] as const;

	const links = $derived({
		lab: (id: number) => `/doctor/patients/${data.patient.pid}/labs/${id}`,
		image: (id: number) => `/doctor/patients/${data.patient.pid}/imaging/${id}`,
		visit: (id: number) => `/doctor/patients/${data.patient.pid}/visits/${id}`
	});
	const source = $derived({
		encounters: data.encounters,
		reports: data.reports,
		labs: data.labs,
		imaging: data.imaging,
		surgeries: data.patient.surgeries
	});
	const sessionEvents = $derived.by(() => {
		const covered = new Set(data.encounters.map((visit) => visit.consultation_id).filter(Boolean));
		return data.consultations
			.filter((consult) => !covered.has(consult.id))
			.filter((consult) => !data.encounters.some((visit) => visit.focus === 'Signed consultation' && consult.narrative && visit.findings === consult.narrative))
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
		const slice: HistorySlice | '' =
			data.tab === 'timeline' ? 'all' : data.tab === 'consults' ? 'consultations' : data.tab === 'images' ? 'images' : data.tab === 'labs' ? 'diagnostics' : '';
		if (!slice) return [];
		const events = historyEvents(source, slice, links);
		if (slice === 'all' || slice === 'consultations') {
			events.push(...sessionEvents);
			events.sort((a, b) => b.at - a.at);
		}
		return events;
	});
	const prescriptionEvents = $derived(
		data.prescriptions.map((order) => {
			const date = order.ordered_at instanceof Date ? order.ordered_at : new Date(order.ordered_at);
			return {
				at: date.getTime(),
				day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
				year: String(date.getFullYear()),
				kind: 'Prescription',
				tone: order.status === 'completed' ? 'bg-emerald-600' : order.status === 'ceased' ? 'bg-slate-400' : 'bg-sky-700',
				title: `Order #${order.code}`,
				meta: [order.prescriber, order.specialty, order.status].filter(Boolean).join(' · '),
				body: order.items.map((item) => [item.name, item.strength].filter(Boolean).join(' ')).join(' · '),
				note: [order.facility, order.completes_on ? `Completes ${formatDate(order.completes_on)}` : ''].filter(Boolean).join(' · '),
				href: `/doctor/patients/${data.patient.pid}/prescriptions/${order.id}`,
				link: 'Open prescription',
				image: ''
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
			class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold {data.tab === id ? 'bg-brand text-white' : 'bg-white text-[#64748B]'}"
			href="?tab={id}">{label}</a>
	{/each}
</nav>

<section class="px-3 py-4 sm:px-4 lg:px-0">
	{#if data.tab === 'timeline' || data.tab === 'consults' || data.tab === 'images'}
		<Timeline events={chartEvents} />
	{:else if data.tab === 'labs'}
		<form class="card mb-6 max-w-3xl space-y-2" method="POST" action="?/orderLab">
			<p class="font-semibold">Order a laboratory panel</p>
			<input class="field" name="name" placeholder="Panel name" required />
			<input class="field" name="facility" placeholder="Facility" />
			<button class="btn" type="submit">Save order</button>
		</form>
		<Timeline events={chartEvents} />
	{:else if data.tab === 'prescriptions'}
		<Timeline events={prescriptionEvents} />
		<a class="btn mt-2 max-w-3xl" href="/doctor/patients/{data.patient.pid}/consult/orders">Create prescription order</a>
	{:else if data.tab === 'tasks'}
		<div class="span-2">
			<p class="mb-3 max-w-2xl text-sm text-[#64748B]">Tests ordered during a consultation. Each uploaded PDF stays with the consultation that created the checklist.</p>
			<TaskChecklist tasks={data.tasks} />
		</div>
	{/if}
</section>
