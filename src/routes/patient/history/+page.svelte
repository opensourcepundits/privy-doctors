<script lang="ts">
	import { ageOn, asDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const views = [
		['all', 'All history'],
		['consultations', 'Consultations'],
		['diagnostics', 'Diagnostics'],
		['images', 'Medical images'],
		['procedures', 'Procedures'],
		['hospital', 'Hospital visits']
	] as const;

	type TimelineEvent = {
		at: number;
		day: string;
		year: string;
		kind: string;
		tone: string;
		title: string;
		meta: string;
		body: string;
		note: string;
		href: string;
	};

	function stamped(value: Date | string) {
		const date = asDate(value);
		return {
			at: date.getTime(),
			day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
			year: String(date.getFullYear())
		};
	}

	const events = $derived.by(() => {
		const items: TimelineEvent[] = [];
		const view = data.view;
		if (view === 'all' || view === 'consultations') {
			for (const visit of data.encounters) {
				const when = stamped(visit.occurred_on);
				items.push({
					...when,
					kind: 'Consultation',
					tone: 'bg-brand',
					title: visit.focus,
					meta: `${visit.doctor_name} · ${visit.kind}`,
					body: visit.findings,
					note: visit.plan,
					href: ''
				});
			}
		}
		if (view === 'all' || view === 'diagnostics') {
			for (const lab of data.labs) {
				const when = lab.collected_on ? stamped(lab.collected_on) : { at: 0, day: 'Pending', year: '' };
				items.push({
					...when,
					kind: 'Laboratory',
					tone: 'bg-emerald-600',
					title: lab.name,
					meta: [lab.facility, lab.ordering_md].filter(Boolean).join(' · '),
					body: lab.note ?? '',
					note: '',
					href: ''
				});
			}
		}
		if (view === 'all' || view === 'images') {
			for (const study of data.imaging) {
				const when = study.performed_on ? stamped(study.performed_on) : { at: 0, day: 'Pending', year: '' };
				items.push({
					...when,
					kind: study.modality || 'Imaging',
					tone: 'bg-violet-600',
					title: study.title,
					meta: study.facility ?? '',
					body: study.summary ?? '',
					note: '',
					href: `/patient/imaging/${study.id}`
				});
			}
		}
		if (view === 'all' || view === 'procedures') {
			for (const item of data.patient.surgeries) {
				const year = Number(item.year);
				items.push({
					at: Number.isFinite(year) ? Date.UTC(year, 0, 1) : 0,
					day: item.year,
					year: '',
					kind: 'Procedure',
					tone: 'bg-amber-600',
					title: item.name,
					meta: 'Procedure on file',
					body: '',
					note: '',
					href: ''
				});
			}
		}
		return items.sort((a, b) => b.at - a.at);
	});
</script>

<header class="px-4 pt-5 lg:px-0">
	<h1 class="display text-2xl font-bold">Health and medical history</h1>
	<p class="text-sm">{data.patient.first_name} {data.patient.last_name} · {ageOn(data.patient.dob)} yrs · {data.patient.pid}</p>
	<p class="mt-3 max-w-3xl text-sm text-[#64748B]">
		Conditions: {data.patient.conditions.join(' · ') || 'None filed'}. Allergies: {data.patient.allergies.join(' · ') || 'None filed'}. Blood type {data.patient.blood_type}.
	</p>
</header>

<nav class="mt-4 flex gap-2 overflow-x-auto px-4 lg:px-0">
	{#each views as [id, label]}
		<a class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold {data.view === id ? 'bg-brand text-white' : 'bg-white text-[#64748B]'}" href="?view={id}">{label}</a>
	{/each}
</nav>

<section class="px-4 py-6 lg:px-0">
	{#if events.length}
		<ol class="max-w-3xl">
			{#each events as event, index}
				<li class="grid grid-cols-[4.5rem_1.25rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[6.5rem_1.25rem_minmax(0,1fr)] sm:gap-x-4">
					<div class="pt-0.5 text-right">
						<p class="text-sm font-semibold leading-5">{event.day}</p>
						{#if event.year}<p class="text-xs text-[#64748B]">{event.year}</p>{/if}
					</div>
					<div class="relative flex justify-center">
						<span class="absolute w-px bg-brand/25 {index === events.length - 1 ? 'top-0 h-3' : 'inset-y-0'}"></span>
						<span class="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full {event.tone} ring-4 ring-canvas"></span>
					</div>
					<div class="pb-8">
						<p class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">{event.kind}</p>
						<h2 class="font-semibold">{event.title}</h2>
						{#if event.meta}<p class="text-sm text-[#64748B]">{event.meta}</p>{/if}
						{#if event.body}<p class="mt-1 text-sm">{event.body}</p>{/if}
						{#if event.note}<p class="mt-1 text-sm text-[#64748B]">{event.note}</p>{/if}
						{#if event.href}
							<a class="mt-1 inline-flex text-sm font-semibold text-brand" href={event.href}>View the imaging report</a>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{:else}
		<div class="max-w-3xl border-l border-brand/25 py-2 pl-6">
			<p class="font-semibold">No records found</p>
			<p class="text-sm text-[#64748B]">There are no records filed under this category.</p>
			{#if data.view !== 'all'}
				<a class="text-sm font-semibold text-brand" href="?view=all">Show all history</a>
			{/if}
		</div>
	{/if}
</section>
