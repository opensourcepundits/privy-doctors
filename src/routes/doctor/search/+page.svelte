<script lang="ts">
	import IncomingMenu from '#lib/components/IncomingMenu.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { ageOn, initials } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let opened = $state(false);
	let query = $state('');
	const showNew = $derived(opened || Boolean(form?.offerNew));

	function identity(patient: { access: string; nic: string | null; passport: string | null }) {
		if (patient.access !== 'granted') return 'Record locked';
		const parts = [
			patient.nic ? `NIC ${patient.nic}` : '',
			patient.passport ? `Passport ${patient.passport}` : ''
		].filter(Boolean);
		return parts.join(' · ') || 'NIC / passport not on file';
	}
</script>

<header class="px-4 pt-6 lg:px-0">
	<div>
		<p class="kicker">Patient index</p>
		<h1 class="display text-2xl font-bold lg:text-3xl">{data.intent === 'consult' ? 'Start a consultation' : 'Find a patient'}</h1>
		<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
			{#if data.intent === 'consult'}
				Patients you already care for can be opened now. Everyone else stays locked until they allow access, or until you scan their QR code or enter an access code.
			{:else}
				Search finds a name and record number. The chart stays locked until the patient allows access, or you scan their QR code or enter an access code.
			{/if}
		</p>
	</div>
	<div class="action-row mt-4">
		{#if data.intent === 'consult'}
			<IncomingMenu referrals={data.incoming} />
		{/if}
		<a class="btn" href="/doctor/scan">
			<span class="material-symbols-outlined text-lg">qr_code_scanner</span>
			Scan QR
		</a>
	</div>
</header>

{#if data.intent === 'consult'}
	<label class="relative mx-4 mt-4 block lg:mx-0 lg:max-w-xl">
		<span class="material-symbols-outlined field-icon text-[#64748B]" aria-hidden="true">search</span>
		<input class="field field-search" bind:value={query} autocomplete="off" placeholder="Search by name, NIC, or passport" />
	</label>
	{#if form?.message && !form?.offerNew}
		<p class="mx-4 mt-3 text-sm text-red-600 lg:mx-0">{form.message}</p>
	{/if}
	<p class="mx-4 mt-3 text-sm text-[#64748B] lg:mx-0">Patients you can open</p>
	{#await data.patients}
		<div class="px-4 py-4 lg:px-0"><Skeleton count={4} /></div>
	{:then patients}
		{@const roster = patients.filter((patient) => {
			const needle = query.trim().toLowerCase();
			if (!needle) return true;
			const haystack = [patient.first_name, patient.last_name, patient.pid, patient.nic, patient.passport]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(needle) || `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(needle);
		})}
		<p class="mx-4 text-sm text-[#64748B] lg:mx-0">{roster.length} {roster.length === 1 ? 'patient' : 'patients'}</p>
		<section class="cards-2 px-4 py-4 lg:px-0">
		{#each roster as patient}
			<form class="card lg:flex lg:items-center lg:justify-between lg:gap-6" method="POST" action="?intent=consult&/start">
				<input type="hidden" name="pid" value={patient.pid} />
				<div class="flex min-w-0 items-center gap-3">
					<div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand">
						{initials(patient.first_name, patient.last_name)}
					</div>
					<div class="min-w-0">
						<p class="font-semibold">{patient.first_name} {patient.last_name}</p>
						<p class="text-sm text-[#64748B]">{ageOn(patient.dob)}y · {patient.sex} · {patient.pid}</p>
						<p class="text-sm">{identity(patient)}</p>
					</div>
				</div>
				{#if patient.access === 'granted'}
				<button class="btn mt-3 shrink-0 lg:mt-0" type="submit">
					<span class="material-symbols-outlined text-lg">play_arrow</span>
					Select and start consultation
				</button>
			{:else if patient.access === 'pending'}
				<p class="mt-3 shrink-0 text-sm text-[#64748B] lg:mt-0 lg:max-w-56">Waiting for the patient to allow access.</p>
			{:else if patient.access === 'revoked'}
				<a class="btn mt-3 shrink-0 lg:mt-0" href="/doctor/access/{patient.pid}">Scan QR or enter a code</a>
			{:else if patient.has_portal}
				<button class="btn mt-3 shrink-0 lg:mt-0" type="submit" formaction="?intent=consult&/request">Ask the patient for access</button>
			{:else}
				<a class="btn mt-3 shrink-0 lg:mt-0" href="/doctor/access/{patient.pid}">Scan QR or enter a code</a>
			{/if}
			</form>
		{:else}
			<p class="text-sm text-[#64748B]">No registered patient matches that search.</p>
		{/each}
	</section>
	{:catch}
		<p class="px-4 text-sm text-[#64748B] lg:px-0">The patient list could not be loaded.</p>
	{/await}

	<section class="mx-4 pb-4 lg:mx-0 lg:max-w-xl">
		{#if showNew}
			<form class="card space-y-3" method="POST" action="?intent=consult&/register">
				<div>
					<h2 class="display text-base font-bold">New patient</h2>
					<p class="mt-1 text-sm text-[#64748B]">No portal account is created. A clinic chart is saved for this visit. Enter a NIC, a passport number, or both.</p>
				</div>
				{#if form?.message && form?.offerNew}
					<p class="text-sm text-red-600">{form.message}</p>
				{/if}
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-sm font-semibold" for="first-name">
						First name
						<input class="field mt-1" id="first-name" name="first_name" required autocomplete="off" value={form?.firstName ?? ''} />
					</label>
					<label class="block text-sm font-semibold" for="last-name">
						Last name
						<input class="field mt-1" id="last-name" name="last_name" required autocomplete="off" value={form?.lastName ?? ''} />
					</label>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-sm font-semibold" for="dob">
						Date of birth
						<input class="field mt-1" id="dob" name="dob" type="date" required value={form?.dob ?? ''} />
					</label>
					<label class="block text-sm font-semibold" for="sex">
						Sex
						<select class="field mt-1" id="sex" name="sex" required>
							<option value="" selected={!form?.sex}>Select</option>
							<option value="Female" selected={form?.sex === 'Female'}>Female</option>
							<option value="Male" selected={form?.sex === 'Male'}>Male</option>
						</select>
					</label>
				</div>
				<label class="block text-sm font-semibold" for="nic">
					NIC
					<input class="field mt-1" id="nic" name="nic" autocomplete="off" value={form?.nic ?? ''} placeholder="National identity card" />
				</label>
				<label class="block text-sm font-semibold" for="passport">
					Passport number
					<input class="field mt-1" id="passport" name="passport" autocomplete="off" value={form?.passport ?? ''} placeholder="Passport number" />
				</label>
				<label class="block text-sm font-semibold" for="phone">
					Phone
					<input class="field mt-1" id="phone" name="phone" type="tel" autocomplete="off" value={form?.phone ?? ''} placeholder="Optional" />
				</label>
				<button class="btn btn-block" type="submit">
					<span class="material-symbols-outlined text-lg">person_add</span>
					Register and start consultation
				</button>
			</form>
		{:else}
			<button class="btn-line btn-block" type="button" onclick={() => (opened = true)}>
				<span class="material-symbols-outlined text-lg">person_add</span>
				New patient without an account
			</button>
		{/if}
	</section>
{:else}
	<form class="px-4 pt-4 lg:max-w-xl lg:px-0" method="GET">
		<label class="relative block">
			<span class="material-symbols-outlined field-icon text-[#64748B]" aria-hidden="true">search</span>
			<input class="field field-search" name="q" value={data.q} placeholder="Name, PID, NIC, or passport" />
			<button class="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-brand px-3.5 text-xs font-semibold text-white" type="submit">Find</button>
		</label>
	</form>

	<section class="cards-2 px-4 py-4 lg:px-0">
		{#await data.patients}
			<Skeleton count={4} />
		{:then patients}
		{#each patients as patient}
			<a class="card block" href={patient.access === 'granted' ? `/doctor/patients/${patient.pid}` : `/doctor/access/${patient.pid}`}>
				<div class="flex items-center gap-3">
					<div class="grid h-11 w-11 place-items-center rounded-full bg-brand-soft font-bold text-brand">
						{initials(patient.first_name, patient.last_name)}
					</div>
					<div>
						<p class="font-semibold">{patient.first_name} {patient.last_name}</p>
						<p class="text-sm text-[#64748B]">{patient.pid} • {ageOn(patient.dob)}y • {patient.sex}</p>
						{#if patient.access === 'granted'}
							{#if patient.nic || patient.passport}
								<p class="text-sm text-[#64748B]">{patient.nic ? `NIC ${patient.nic}` : ''}{patient.nic && patient.passport ? ' · ' : ''}{patient.passport ? `Passport ${patient.passport}` : ''}</p>
							{/if}
							{#if patient.conditions[0]}<p class="text-sm">{patient.conditions[0]}</p>{/if}
						{:else if patient.access === 'pending'}
							<p class="text-sm text-[#64748B]">Waiting for the patient to allow access</p>
						{:else if patient.access === 'revoked'}
							<p class="text-sm text-[#64748B]">Access revoked. Scan the QR code or enter an access code.</p>
						{:else}
							<p class="text-sm text-[#64748B]">Record locked</p>
						{/if}
					</div>
				</div>
			</a>
		{:else}
			<p class="text-sm text-[#64748B]">No patients match that search.</p>
		{/each}
		{:catch}
			<p class="text-sm text-[#64748B]">The patient list could not be loaded.</p>
		{/await}
	</section>
{/if}
