<script lang="ts">
	import { ageOn, formatDate, initials } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const patient = $derived(data.patient);
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Your account</p>
	<div class="mt-3 flex items-center gap-4">
		<div class="grid h-16 w-16 place-items-center rounded-full bg-[#0D7377] text-lg font-bold text-white">
			{initials(patient.first_name, patient.last_name)}
		</div>
		<div>
			<h1 class="display text-2xl font-bold lg:text-3xl">{patient.first_name} {patient.last_name}</h1>
			<p class="text-sm text-[#64748B]">{ageOn(patient.dob)} years · {patient.sex} · {patient.pid}</p>
		</div>
	</div>
</header>

<section class="cards-2 px-4 py-4 text-sm lg:px-0">
	<article class="card">
		<p class="kicker">Identity</p>
		<dl class="mt-3 space-y-2">
			<div class="flex justify-between gap-4"><dt class="text-[#64748B]">Date of birth</dt><dd>{formatDate(patient.dob)}</dd></div>
			<div class="flex justify-between gap-4"><dt class="text-[#64748B]">Blood type</dt><dd>{patient.blood_type ?? '—'}</dd></div>
			<div class="flex justify-between gap-4"><dt class="text-[#64748B]">NIC</dt><dd>{patient.nic ?? '—'}</dd></div>
			<div class="flex justify-between gap-4"><dt class="text-[#64748B]">Phone</dt><dd>{patient.phone ?? '—'}</dd></div>
			<div class="flex justify-between gap-4"><dt class="text-[#64748B]">Email</dt><dd class="text-right">{data.user.email}</dd></div>
		</dl>
	</article>

	<article class="card">
		<p class="kicker">Clinical profile</p>
		<p class="mt-3 font-semibold">Conditions</p>
		<p>{patient.conditions.length ? patient.conditions.join(' · ') : 'None filed'}</p>
		<p class="mt-3 font-semibold">Allergies</p>
		<p>{patient.allergies.length ? patient.allergies.join(' · ') : 'None filed'}</p>
		<p class="mt-3 font-semibold">Procedures</p>
		<p>{patient.surgeries.length ? patient.surgeries.map((item) => `${item.name} (${item.year})`).join(' · ') : 'None filed'}</p>
	</article>

	<article class="card">
		<p class="kicker">Insurance</p>
		<p class="mt-3 font-semibold">{patient.insurance_name ?? 'No plan on file'}</p>
		{#if patient.insurance_group || patient.insurance_member}
			<p>Group {patient.insurance_group ?? '—'} · Member {patient.insurance_member ?? '—'}</p>
		{/if}
	</article>

	<article class="card">
		<p class="kicker">Pharmacy</p>
		<p class="mt-3 font-semibold">{patient.pharmacy_name ?? 'No preferred pharmacy'}</p>
		{#if patient.pharmacy_address}<p>{patient.pharmacy_address}</p>{/if}
		{#if patient.pharmacy_phone}<p>{patient.pharmacy_phone}</p>{/if}
	</article>

	{#if data.clinician}
		<article class="card span-2">
			<p class="kicker">Care team</p>
			<p class="mt-3 font-semibold">{data.clinician.name}, {data.clinician.credentials}</p>
			<p>{data.clinician.specialty} · {data.clinician.practice}</p>
			<p class="text-[#64748B]">{data.clinician.location}</p>
			{#if data.clinician.phone}<p class="mt-1">Concierge line {data.clinician.phone}</p>{/if}
			{#if patient.concierge_note}<p class="mt-2">{patient.concierge_note}</p>{/if}
		</article>
	{/if}

	<div class="span-2 flex flex-col gap-3 sm:flex-row">
		<a class="btn" href="/patient/help">Contact care team</a>
		{#if !data.preview}
			<form method="POST" action="/logout"><button class="btn-line" type="submit">Sign out</button></form>
		{/if}
	</div>
</section>
