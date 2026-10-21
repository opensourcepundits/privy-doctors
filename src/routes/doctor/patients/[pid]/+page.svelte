<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import { ageOn, formatDate, formatTime } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const tabs = [
		['checkups', 'Checkups'],
		['prescriptions', 'Prescriptions'],
		['images', 'Images'],
		['labs', 'Labs']
	] as const;
	const tone = (status: string) =>
		status === 'active' ? 'teal' : status === 'completed' ? 'success' : status === 'ceased' ? 'muted' : 'warning';
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-[#0D7377]" href="/doctor">
		<span class="material-symbols-outlined text-base">arrow_back</span> Schedule
	</a>
	<div class="mt-3 flex items-center gap-3">
		<div class="grid h-12 w-12 place-items-center rounded-full bg-[#0D7377] font-bold text-white">
			{data.patient.first_name[0]}{data.patient.last_name[0]}
		</div>
		<div>
			<h1 class="display text-2xl font-bold">{data.patient.first_name} {data.patient.last_name}</h1>
			<p class="text-sm text-[#64748B]">{data.patient.pid} · {ageOn(data.patient.dob)}y · {data.patient.sex}{#if data.patient.blood_type} · Blood {data.patient.blood_type}{/if}{#if data.patient.nic} · NIC {data.patient.nic}{/if}</p>
		</div>
	</div>
	<p class="mt-3 text-sm">DOB {formatDate(data.patient.dob)} · {data.patient.concierge_note}</p>
	{#if data.patient.allergies.length}
		<p class="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700">Critical allergies: {data.patient.allergies.join(', ')}</p>
	{/if}
</header>

<nav class="mt-4 flex gap-2 overflow-x-auto px-4 lg:px-0">
	{#each tabs as [id, label]}
		<a
			class="shrink-0 rounded-full px-3 py-2 text-sm font-semibold {data.tab === id ? 'bg-[#0D7377] text-white' : 'bg-white text-[#64748B]'}"
			href="?tab={id}">{label}</a>
	{/each}
</nav>

<section class="cards-2 px-4 py-4 lg:px-0">
	{#if data.tab === 'checkups'}
		<p class="kicker">{data.encounters.length} visits recorded</p>
		{#each data.encounters as visit}
			<article class="card">
				<p class="text-xs text-[#64748B]">{formatDate(visit.occurred_on)}</p>
				<h2 class="font-semibold">{visit.doctor_name}</h2>
				<p class="text-sm text-[#0D7377]">{visit.kind}</p>
				<p class="mt-2 text-sm"><span class="font-semibold">Focus:</span> {visit.focus}</p>
				<p class="mt-1 text-sm">{visit.findings}</p>
				<p class="mt-2 text-sm text-[#334155]">{visit.plan}</p>
				<p class="mt-2 text-xs text-[#64748B]">{visit.location}</p>
			</article>
		{:else}
			<p class="card text-sm">No encounters are filed yet. Clara’s first visit can be signed from a new consultation.</p>
		{/each}
		<a class="btn" href="/doctor/patients/{data.patient.pid}/consult">New consultation</a>
	{:else if data.tab === 'prescriptions'}
		<p class="kicker">{data.prescriptions.length} orders</p>
		{#each data.prescriptions as order}
			<article class="card">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold">Order #{order.code}</h2>
					<Badge tone={tone(order.status)}>{order.status}</Badge>
				</div>
				<p class="text-xs text-[#64748B]">{formatDate(order.ordered_at)} · {formatTime(order.ordered_at)}</p>
				<p class="mt-2 text-sm">{order.prescriber} · {order.specialty}</p>
				<p class="mt-2 text-sm">{order.items.map((item) => item.name).join(' · ')}</p>
				<p class="text-xs text-[#64748B]">{order.facility}</p>
				<a class="mt-3 inline-flex text-sm font-semibold text-[#0D7377]" href="/doctor/patients/{data.patient.pid}/prescriptions/{order.id}">View prescription details</a>
			</article>
		{/each}
		<a class="btn" href="/doctor/patients/{data.patient.pid}/consult/orders">Create prescription order</a>
	{:else if data.tab === 'images'}
		<p class="kicker">{data.imaging.length} verified studies</p>
		{#each data.imaging as study}
			<article class="card">
				<p class="text-xs font-semibold text-[#0D7377]">{study.modality} · {formatDate(study.performed_on)}</p>
				<h2 class="font-semibold">{study.title}</h2>
				<p class="text-sm text-[#64748B]">{study.facility}</p>
				{#if study.radiologist}<p class="text-sm">Radiologist: {study.radiologist}</p>{/if}
				<p class="mt-2 text-sm">{study.summary}</p>
				<p class="text-xs text-[#64748B]">{study.meta}</p>
				<a class="mt-3 inline-flex text-sm font-semibold text-[#0D7377]" href="/doctor/patients/{data.patient.pid}/imaging/{study.id}">View scan</a>
			</article>
		{/each}
	{:else}
		<form class="card space-y-2" method="POST" action="?/orderLab">
			<p class="font-semibold">Order a laboratory panel</p>
			<input class="field" name="name" placeholder="Panel name" required />
			<input class="field" name="facility" placeholder="Facility" />
			<button class="btn" type="submit">Save order</button>
		</form>
		{#each data.labs as lab}
			<article class="card">
				<div class="flex items-center justify-between">
					<p class="text-xs font-semibold text-[#64748B]">{lab.category}</p>
					<Badge tone={lab.status === 'completed' ? 'success' : 'warning'}>{lab.status}</Badge>
				</div>
				<h2 class="font-semibold">{lab.name}</h2>
				<p class="text-xs text-[#64748B]">{formatDate(lab.collected_on)} · {lab.facility}</p>
				<ul class="mt-2 space-y-1 text-sm">
					{#each lab.results.slice(0, 4) as result}
						<li class="flex justify-between gap-3">
							<span>{result.name}</span>
							<span class="nums">{result.value_text ?? result.value_num} {result.unit} · {result.flag}</span>
						</li>
					{/each}
				</ul>
				<a class="mt-3 inline-flex text-sm font-semibold text-[#0D7377]" href="/doctor/patients/{data.patient.pid}/labs/{lab.id}">View lab detail</a>
			</article>
		{/each}
	{/if}
</section>
