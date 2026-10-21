<script lang="ts">
	import { ageOn, initials } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let opened = $state(false);
	const showNew = $derived(opened || Boolean(form?.offerNew));
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Patient index</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">{data.intent === 'consult' ? 'Start a consultation' : 'Find a patient'}</h1>
	{#if data.intent === 'consult'}
		<p class="mt-1 text-sm text-[#64748B]">Enter the patient name, then start. The start time is saved with the consultation.</p>
	{/if}
</header>

{#if data.intent === 'consult'}
	<form class="card mx-4 mt-4 space-y-3 lg:mx-0 lg:max-w-xl" method="POST" action="?intent=consult&/start">
		<label class="block text-sm font-semibold" for="patient-name">Patient name</label>
		<input
			class="field"
			id="patient-name"
			name="name"
			required
			autocomplete="off"
			value={form?.name ?? ''}
			placeholder="First and last name"
		/>
		{#if form?.message && !form?.matches && !form?.offerNew}
			<p class="text-sm text-red-600">{form.message}</p>
		{/if}
		<button class="btn btn-block" type="submit">
			<span class="material-symbols-outlined text-lg">play_arrow</span>
			Start consultation
		</button>
	</form>

	<section class="mx-4 mt-4 lg:mx-0 lg:max-w-xl">
		{#if showNew}
			<form class="card space-y-3" method="POST" action="?intent=consult&/register">
				<div>
					<h2 class="display text-base font-bold">New patient</h2>
					<p class="mt-1 text-sm text-[#64748B]">No portal account is created. A clinic chart is saved for this visit.</p>
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
					<input class="field mt-1" id="nic" name="nic" required autocomplete="off" value={form?.nic ?? ''} placeholder="National identity card" />
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

	{#if form?.matches}
		<section class="cards-2 px-4 py-4 lg:px-0">
			<p class="text-sm text-[#64748B]">{form.message}</p>
			{#each form.matches as patient}
				<form class="card" method="POST" action="?intent=consult&/start">
					<input type="hidden" name="pid" value={patient.pid} />
					<input type="hidden" name="name" value={form?.name ?? ''} />
					<div class="flex items-center gap-3">
						<div class="grid h-11 w-11 place-items-center rounded-full bg-[#E5EEFF] font-bold text-[#0D7377]">
							{initials(patient.first_name, patient.last_name)}
						</div>
						<div>
							<p class="font-semibold">{patient.first_name} {patient.last_name}</p>
							<p class="text-sm text-[#64748B]">{patient.pid} • {ageOn(patient.dob)}y • {patient.sex}</p>
							<p class="text-sm">{patient.conditions[0] ?? patient.concierge_note}</p>
						</div>
					</div>
					<button class="btn btn-block mt-3" type="submit">
						<span class="material-symbols-outlined text-lg">play_arrow</span>
						Start consultation
					</button>
				</form>
			{/each}
		</section>
	{/if}
{:else}
	<form class="px-4 pt-4 lg:max-w-xl lg:px-0" method="GET">
		<label class="relative block">
			<span class="material-symbols-outlined field-icon text-[#64748B]" aria-hidden="true">search</span>
			<input class="field field-search" name="q" value={data.q} placeholder="Name or PID" />
			<button class="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-[#0D7377] px-3.5 text-xs font-semibold text-white" type="submit">Find</button>
		</label>
	</form>

	<section class="cards-2 px-4 py-4 lg:px-0">
		{#each data.patients as patient}
			<a class="card block" href="/doctor/patients/{patient.pid}">
				<div class="flex items-center gap-3">
					<div class="grid h-11 w-11 place-items-center rounded-full bg-[#E5EEFF] font-bold text-[#0D7377]">
						{initials(patient.first_name, patient.last_name)}
					</div>
					<div>
						<p class="font-semibold">{patient.first_name} {patient.last_name}</p>
						<p class="text-sm text-[#64748B]">{patient.pid} • {ageOn(patient.dob)}y • {patient.sex}</p>
						<p class="text-sm">{patient.conditions[0] ?? patient.concierge_note}</p>
					</div>
				</div>
			</a>
		{:else}
			<p class="text-sm text-[#64748B]">No patients match that search.</p>
		{/each}
	</section>
{/if}
