<script lang="ts">
	import { enhance } from '$app/forms';
	import ConsultTimer from '#lib/components/ConsultTimer.svelte';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { frequencyTags, mealTags, tagsFrom } from '#lib/doses';
	import { formatDate, isoDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let open = $state<'medication' | 'referral' | 'test' | null>(null);
	let specialist = $state('');
	let picked = $state<number | null>(null);
	let medQuery = $state('');
	let medNote = $state('');
	let medList = $state(false);

	function timesFor(med: { doctors: Record<string, { times: number }> }) {
		return med.doctors[String(data.doctor.id)]?.times ?? 0;
	}

	const medMatches = $derived.by(() => {
		const needle = medQuery.trim().toLowerCase();
		if (!needle) return [];
		return data.medicines
			.filter((med) => [med.name, med.description].join(' ').toLowerCase().includes(needle))
			.sort((a, b) => timesFor(b) - timesFor(a) || a.name.localeCompare(b.name))
			.slice(0, 8);
	});

	function chooseMedicine(med: (typeof data.medicines)[number]) {
		medQuery = med.name;
		if (!medNote.trim() && med.description) medNote = med.description;
		medList = false;
	}

	const specialistMatches = $derived.by(() => {
		const needle = specialist.trim().toLowerCase();
		const rows = data.doctors.filter((doctor) => {
			if (!needle) return true;
			return [doctor.name, doctor.credentials, doctor.specialty, doctor.practice, doctor.location]
				.join(' ')
				.toLowerCase()
				.includes(needle);
		});
		return rows.slice(0, 8);
	});
	const chosen = $derived(data.doctors.find((doctor) => doctor.id === picked) ?? null);

	$effect.pre(() => {
		if (form && 'referral' in form && form.referral) open = 'referral';
	});
	let completesOn = $state('');
	let frequency = $state('');
	let meal = $state('');
	let loadedId = 0;

	function postedCompletion() {
		if (form && 'completesOn' in form && typeof form.completesOn === 'string') return form.completesOn;
		return '';
	}

	$effect.pre(() => {
		const next = postedCompletion() || isoDate(data.consult.completes_on);
		if (loadedId === data.consult.id && !postedCompletion()) return;
		loadedId = data.consult.id;
		completesOn = next;
	});

	const meds = $derived(data.consult.orders.filter((order) => order.kind === 'medication'));
	const referrals = $derived(data.consult.orders.filter((order) => order.kind === 'referral'));
	const tests = $derived(data.consult.orders.filter((order) => order.kind === 'test'));
	const ready = $derived(Number(meds.length > 0) + Number(referrals.length > 0) + Number(tests.length > 0));

	function rememberCompletion() {
		const body = new FormData();
		body.set('completes_on', completesOn);
		fetch('?/completion', { method: 'POST', body });
	}
</script>

<header class="flex items-center justify-between gap-3 px-4 pt-5 lg:px-0">
	<div class="flex min-w-0 items-center gap-2">
		<a class="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white" href="/doctor/patients/{data.patient.pid}/consult" aria-label="Back to notes">
			<span class="material-symbols-outlined">arrow_back</span>
		</a>
		<div>
			<p class="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-600 uppercase">
				<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
				In session
			</p>
			<h1 class="display text-base font-bold lg:text-xl">Orders and disposition</h1>
		</div>
	</div>
	<ConsultTimer startedAt={data.consult.started_at} />
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	<article class="card">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<h2 class="display text-base font-bold">{data.patient.first_name} {data.patient.last_name}</h2>
				<span class="rounded-md bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-[#334155]">{data.patient.pid}</span>
			</div>
			<span class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active encounter</span>
		</div>
		<p class="mt-1 text-xs text-[#64748B]">{data.consult.code} · Orders and disposition plan</p>
	</article>

	{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}

	<section class="space-y-2">
		<div class="flex items-center justify-between gap-2">
			<h2 class="display flex items-center gap-2 text-sm font-bold">
				<span class="grid h-7 w-7 place-items-center rounded-lg border border-brand-tint bg-brand-soft text-brand">
					<span class="material-symbols-outlined text-[18px]">prescriptions</span>
				</span>
				e-Prescription orders
			</h2>
			<button
				class="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white"
				type="button"
				onclick={() => {
					open = open === 'medication' ? null : 'medication';
					if (open === 'medication') {
						medQuery = '';
						medNote = '';
						frequency = '';
						meal = '';
						medList = false;
					}
				}}
			>
				<span class="material-symbols-outlined text-base">add</span>
				Add medication
			</button>
		</div>
		<div class="card space-y-2">
			{#each meds as order}
				<div class="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
					<div class="min-w-0">
						<p class="text-sm font-bold">{order.title}</p>
						{#if order.detail}<p class="text-[11px] text-[#64748B]">{order.detail}</p>{/if}
						{#if order.note}<p class="text-[11px] text-[#64748B]">{order.note}</p>{/if}
						{#if order.tags}
							{@const marks = tagsFrom(order.tags)}
							<div class="mt-1"><DoseMarks item={{ name: order.title, frequency: marks.frequency, schedule_detail: marks.meal }} /></div>
						{/if}
						{#if order.completes_on}<p class="text-[11px] text-[#64748B]">Completes {formatDate(order.completes_on)}</p>{/if}
					</div>
					<form method="POST" action="?/remove">
						<input type="hidden" name="id" value={order.id} />
						<button class="grid h-8 w-8 place-items-center rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600" type="submit" aria-label="Remove medication">
							<span class="material-symbols-outlined text-[18px]">delete_outline</span>
						</button>
					</form>
				</div>
			{:else}
				<p class="text-sm text-[#64748B]">No medications on this order set yet.</p>
			{/each}
			{#if open === 'medication'}
				<form
					class="space-y-3 rounded-xl border border-dashed border-[#CBD5E1] p-3"
					method="POST"
					action="?/medication"
					use:enhance={() => {
						return async ({ update }) => {
							frequency = '';
							meal = '';
							medQuery = '';
							medNote = '';
							medList = false;
							open = null;
							await update();
						};
					}}
				>
					<div class="relative">
						<input
							class="field"
							name="title"
							placeholder="Medication"
							required
							autocomplete="off"
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={medList && medQuery.trim().length > 0}
							aria-controls="medicine-matches"
							bind:value={medQuery}
							oninput={() => (medList = true)}
							onfocus={() => (medList = true)}
							onblur={() => (medList = false)}
						/>
						{#if medList && medQuery.trim()}
							<ul id="medicine-matches" class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[#E2E8F0] bg-white shadow-lg" role="listbox">
								{#each medMatches as med}
									<li class="border-t border-[#E2E8F0] first:border-t-0">
										<button
											class="block w-full px-3 py-2 text-left hover:bg-brand-wash"
											type="button"
											role="option"
											aria-selected="false"
											onmousedown={(event) => event.preventDefault()}
											onclick={() => chooseMedicine(med)}
										>
											<span class="block text-sm font-semibold">{med.name}</span>
											{#if med.description}<span class="block text-xs text-[#64748B]">{med.description}</span>{/if}
											{#if timesFor(med)}
												<span class="block text-xs text-brand">Prescribed by you {timesFor(med) === 1 ? '1 time' : `${timesFor(med)} times`}</span>
											{/if}
										</button>
									</li>
								{:else}
									<li class="px-3 py-2 text-sm text-[#64748B]">No saved medicine matches. This name will be added when you save.</li>
								{/each}
							</ul>
						{/if}
					</div>
					<input class="field" name="detail" placeholder="Dose and supply" />
					<input class="field" name="note" placeholder="Indication" bind:value={medNote} />
					<fieldset>
						<legend class="text-sm font-semibold">How often</legend>
						<div class="mt-1 grid gap-1 sm:grid-cols-2">
							{#each frequencyTags as tag}
								<label class="flex items-center gap-2 text-sm">
									<input
										name="frequency"
										type="checkbox"
										value={tag}
										checked={frequency === tag}
										onchange={(event) => (frequency = event.currentTarget.checked ? tag : '')}
									/>
									{tag}
								</label>
							{/each}
						</div>
					</fieldset>
					<fieldset>
						<legend class="text-sm font-semibold">With meals</legend>
						<div class="mt-1 grid gap-1 sm:grid-cols-2">
							{#each mealTags as tag}
								<label class="flex items-center gap-2 text-sm">
									<input
										name="meal"
										type="checkbox"
										value={tag}
										checked={meal === tag}
										onchange={(event) => (meal = event.currentTarget.checked ? tag : '')}
									/>
									{tag}
								</label>
							{/each}
						</div>
					</fieldset>
					<label class="block text-sm font-semibold">
						Completion date
						<span class="font-normal text-[#64748B]">optional</span>
						<input class="field mt-1" name="completes_on" type="date" />
					</label>
					<button class="btn" type="submit">Save medication</button>
				</form>
			{/if}
			<label class="block text-sm font-semibold" for="rx-complete">
				Prescription completion date
				<input
					class="field mt-1"
					id="rx-complete"
					name="completes_on"
					type="date"
					form="finalize"
					required={meds.length > 0}
					bind:value={completesOn}
					onchange={rememberCompletion}
				/>
			</label>
		</div>
	</section>

	<div class="grid items-start gap-4 lg:grid-cols-2">
		<section class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="display flex items-center gap-2 text-sm font-bold">
					<span class="grid h-7 w-7 place-items-center rounded-lg border border-brand-tint bg-brand-soft text-brand">
						<span class="material-symbols-outlined text-[18px]">diversity_1</span>
					</span>
					Referrals
				</h2>
				<button class="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-tint px-2.5 text-xs font-semibold" type="button" onclick={() => (open = open === 'referral' ? null : 'referral')}>
					<span class="material-symbols-outlined text-base">add</span>
					Add
				</button>
			</div>
			{#each referrals as order}
				<article class="card">
					<div class="flex items-start justify-between gap-2">
						<div>
							<h3 class="text-sm font-bold"><Mention text={order.title} /></h3>
							{#if order.detail}<p class="text-[11px] text-[#64748B]">{order.detail}</p>{/if}
						</div>
						<form method="POST" action="?/remove">
							<input type="hidden" name="id" value={order.id} />
							<button class="btn-sm-line" type="submit">Remove</button>
						</form>
					</div>
					{#if order.note}
						<p class="mt-2 rounded-xl border border-[#E2E8F0] bg-brand-wash p-2.5 text-[11px] text-[#0F172A] italic">“{order.note}”</p>
					{/if}
				</article>
			{:else}
				<p class="text-sm text-[#64748B]">No referrals yet.</p>
			{/each}
			{#if open === 'referral'}
				<form class="card space-y-2" method="POST" action="?/referral">
					<label class="block text-sm font-semibold" for="specialist-search">
						Specialist
						<input
							class="field mt-1"
							id="specialist-search"
							bind:value={specialist}
							autocomplete="off"
							placeholder="Search the doctor registry"
							oninput={() => {
								if (chosen && chosen.name !== specialist) picked = null;
							}}
						/>
					</label>
					{#if !chosen}
						<ul class="overflow-hidden rounded-xl border border-[#E2E8F0]">
							{#each specialistMatches as doctor}
								<li class="border-t border-[#E2E8F0] first:border-t-0">
									<button
										class="block w-full px-3 py-2 text-left hover:bg-brand-wash"
										type="button"
										onclick={() => {
											picked = doctor.id;
											specialist = doctor.name;
										}}
									>
										<span class="block text-sm font-semibold">{doctor.name}</span>
										<span class="block text-xs text-[#64748B]">{doctor.credentials} · {doctor.specialty} · {doctor.practice}</span>
									</button>
								</li>
							{:else}
								<li class="px-3 py-2 text-sm text-[#64748B]">No clinician matches that search.</li>
							{/each}
						</ul>
					{:else}
						<div class="rounded-xl border border-brand-tint bg-brand-wash px-3 py-2">
							<p class="text-sm font-semibold">{chosen.name}</p>
							<p class="text-xs text-[#64748B]">{chosen.specialty} · {chosen.location}</p>
							{#if !chosen.has_login}
								<p class="mt-1 text-xs text-[#64748B]">No clinic login is on file, so this referral is saved on the order and no alert is sent.</p>
							{/if}
							<button class="btn-sm mt-1" type="button" onclick={() => (picked = null)}>Choose someone else</button>
						</div>
					{/if}
					<input type="hidden" name="doctor_id" value={picked ?? ''} />
					<input class="field" name="note" placeholder="Referral note" />
					<button class="btn" type="submit">Save referral</button>
				</form>
			{/if}
		</section>

		<section class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="display flex items-center gap-2 text-sm font-bold">
					<span class="grid h-7 w-7 place-items-center rounded-lg border border-brand-tint bg-brand-soft text-brand">
						<span class="material-symbols-outlined text-[18px]">query_stats</span>
					</span>
					Diagnostic tests
				</h2>
				<button class="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white" type="button" onclick={() => (open = open === 'test' ? null : 'test')}>
					<span class="material-symbols-outlined text-base">add</span>
					Order diagnostic
				</button>
			</div>
			<p class="text-xs text-[#64748B]">Each test is added to this patient’s checklist and stays linked to this consultation. They upload the result PDF there.</p>
			<div class="card space-y-2">
				{#each tests as order}
					{@const task = data.consult.tasks.find((item) => item.order_id === order.id)}
					<div class="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
						<div class="min-w-0">
							<p class="text-sm font-bold">{order.title}</p>
							{#if order.uid}<p class="text-[11px] text-[#64748B]">Order {order.uid}{#if data.consult.uid} · Consultation {data.consult.uid}{/if}</p>{/if}
							{#if order.detail}<p class="text-[11px] text-brand">{order.detail}</p>{/if}
							{#if order.note}<p class="text-[11px] text-[#64748B]">{order.note}</p>{/if}
							{#if task?.stored_name}
								<a class="btn-sm mt-1" href="/files/tasks/{task.id}">Result PDF received</a>
							{:else if task}
								<p class="text-[11px] text-[#64748B]">On the patient checklist</p>
							{/if}
						</div>
						<form method="POST" action="?/remove">
							<input type="hidden" name="id" value={order.id} />
							<button class="grid h-7 w-7 place-items-center rounded-lg text-[#64748B] hover:text-red-600" type="submit" aria-label="Remove test">
								<span class="material-symbols-outlined text-base">close</span>
							</button>
						</form>
					</div>
				{:else}
					<p class="text-sm text-[#64748B]">No diagnostics ordered yet.</p>
				{/each}
				{#if open === 'test'}
					<form class="space-y-2" method="POST" action="?/test">
						<input class="field" name="title" placeholder="Test" required />
						<input class="field" name="detail" placeholder="Priority" />
						<input class="field" name="note" placeholder="Clinical question" />
						<button class="btn" type="submit">Save diagnostic</button>
					</form>
				{/if}
			</div>
		</section>
	</div>

	<div class="rounded-2xl border border-[#E2E8F0] bg-white p-4">
		<div class="mb-3 flex items-center justify-between text-xs">
			<span class="text-[#64748B]">Ready for final sign-off</span>
			<span class="font-bold text-emerald-700">{ready} of 3 categories started</span>
		</div>
		<form id="finalize" method="POST" action="?/finalize">
			<button class="btn btn-block" type="submit">
				<span class="material-symbols-outlined text-[19px]">lock</span>
				Authorize orders and finalize consultation
			</button>
		</form>
		<button class="btn-line btn-block mt-2" type="button" onclick={() => window.print()}>
			<span class="material-symbols-outlined text-[18px]">print</span>
			Print patient summary
		</button>
	</div>
</section>
