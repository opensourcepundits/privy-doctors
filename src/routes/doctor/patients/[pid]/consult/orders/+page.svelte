<script lang="ts">
	import { enhance } from '$app/forms';
	import ConsultTimer from '#lib/components/ConsultTimer.svelte';
	import PrescriptionPhotoField from '#lib/components/PrescriptionPhotoField.svelte';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import { frequencyTags, mealTags, tagsFrom } from '#lib/doses';
	import { formatDate, isoDate, money, restDays } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let open = $state<'medication' | 'referral' | 'test' | 'give' | 'order' | null>(null);
	let proofName = $state('');
	let certOpen = $state(false);
	let certReason = $state('');
	let certFrom = $state('');
	let certUntil = $state('');
	let certDate = $state('');
	let certReady = false;
	let closedSavedCertificate = false;
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
		if (form && 'vaccine' in form && (form.vaccine === 'give' || form.vaccine === 'order')) open = form.vaccine;
	});

	function postedCertificate() {
		if (!form || !('certificateDraft' in form) || !form.certificateDraft) return null;
		const draft = form.certificateDraft;
		if (!draft || typeof draft !== 'object') return null;
		return {
			reason: String('reason' in draft ? draft.reason : ''),
			restFrom: String('restFrom' in draft ? draft.restFrom : ''),
			restUntil: String('restUntil' in draft ? draft.restUntil : ''),
			issuedOn: String('issuedOn' in draft ? draft.issuedOn : '')
		};
	}

	$effect.pre(() => {
		const posted = postedCertificate();
		const saved = Boolean(form && 'certificateSaved' in form && form.certificateSaved);
		if (!saved) closedSavedCertificate = false;
		if (posted) {
			certReason = posted.reason;
			certFrom = posted.restFrom;
			certUntil = posted.restUntil;
			certDate = posted.issuedOn;
			certOpen = true;
			certReady = true;
			return;
		}
		if (saved && !closedSavedCertificate) {
			closedSavedCertificate = true;
			certOpen = false;
			certReady = true;
			if (data.certificate) {
				certReason = data.certificate.reason;
				certFrom = data.certificate.restFrom;
				certUntil = data.certificate.restUntil;
				certDate = data.certificate.issuedOn;
			}
			return;
		}
		if (certReady) return;
		certReady = true;
		if (data.certificate) {
			certReason = data.certificate.reason;
			certFrom = data.certificate.restFrom;
			certUntil = data.certificate.restUntil;
			certDate = data.certificate.issuedOn;
			return;
		}
		certDate = data.today;
		certFrom = data.today;
	});

	const certifiedDays = $derived(restDays(certFrom, certUntil));
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

	let itemized = $state(false);
	let billTotal = $state('');
	let billLines = $state([{ description: '', amount: '' }]);
	let billReady = false;

	$effect.pre(() => {
		if (!form || !('billMode' in form) || billReady) return;
		billReady = true;
		itemized = form.billMode === 'items';
		billTotal = typeof form.billTotal === 'string' ? form.billTotal : '';
		if (!Array.isArray(form.items)) return;
		const next = form.items.flatMap((item) => {
			if (!item || typeof item !== 'object') return [];
			const row = item as { description?: unknown; amount?: unknown };
			return [{ description: String(row.description ?? ''), amount: String(row.amount ?? '') }];
		});
		if (next.length) billLines = next;
	});

	const itemSum = $derived(
		billLines.reduce((sum, line) => {
			const text = line.amount.trim();
			if (!/^\d+(\.\d{0,2})?$/.test(text)) return sum;
			return sum + Number(text);
		}, 0)
	);

	const meds = $derived(data.consult.orders.filter((order) => order.kind === 'medication'));
	const referrals = $derived(data.consult.orders.filter((order) => order.kind === 'referral'));
	const tests = $derived(data.consult.orders.filter((order) => order.kind === 'test'));
	const vaccines = $derived(data.consult.orders.filter((order) => order.kind === 'vaccine'));
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
				<p class="text-sm text-[#64748B]">No medications typed yet. Type them in, or upload a photo of the written prescription.</p>
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
			<div class="space-y-2 border-t border-[#E2E8F0] pt-3">
				<p class="text-sm font-semibold">Photograph of the written prescription</p>
				<p class="text-xs text-[#64748B]">Upload a photo instead of typing each medicine.</p>
				{#each data.photos as photo}
					<div class="flex items-start justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
						<a href="/files/prescriptions/{photo.id}" target="_blank" rel="noreferrer">
							<img class="max-h-48 rounded-lg border border-[#E2E8F0] bg-white object-contain" src="/files/prescriptions/{photo.id}" alt={photo.file_name} />
							<span class="mt-1 block text-xs text-[#64748B]">{photo.file_name}</span>
						</a>
						<form method="POST" action="?/removePhoto">
							<input type="hidden" name="id" value={photo.id} />
							<button class="grid h-8 w-8 place-items-center rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600" type="submit" aria-label="Remove prescription photo">
								<span class="material-symbols-outlined text-[18px]">delete_outline</span>
							</button>
						</form>
					</div>
				{/each}
				<PrescriptionPhotoField />
			</div>
			<label class="block text-sm font-semibold" for="rx-complete">
				Prescription completion date
				<span class="font-normal text-[#64748B]">optional</span>
				<input
					class="field mt-1"
					id="rx-complete"
					name="completes_on"
					type="date"
					form="finalize"
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

	<section class="space-y-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="display flex items-center gap-2 text-sm font-bold">
				<span class="grid h-7 w-7 place-items-center rounded-lg border border-brand-tint bg-brand-soft text-brand">
					<span class="material-symbols-outlined text-[18px]">vaccines</span>
				</span>
				Vaccinations
			</h2>
			<div class="flex flex-wrap gap-2">
				<button
					class="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white"
					type="button"
					onclick={() => {
						proofName = '';
						open = open === 'give' ? null : 'give';
					}}
				>
					<span class="material-symbols-outlined text-base">vaccines</span>
					Give vaccination
				</button>
				<button class="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-semibold" type="button" onclick={() => (open = open === 'order' ? null : 'order')}>
					<span class="material-symbols-outlined text-base">add</span>
					Order vaccination
				</button>
			</div>
		</div>
		<p class="text-xs text-[#64748B]">Giving one records it on the patient’s vaccination card now. Ordering one adds it to their to-do list. A photo of the record is optional when it is given.</p>
		<div class="card space-y-2">
			{#each vaccines as order}
				{@const task = data.consult.tasks.find((item) => item.order_id === order.id)}
				{@const shot = data.vaccines.find((item) => item.order_id === order.id)}
				<div class="flex items-start justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
					<div class="min-w-0">
						<p class="text-sm font-bold">{order.title}</p>
						{#if order.detail}<p class="text-[11px] text-[#64748B]">{order.detail}</p>{/if}
						{#if order.note}<p class="text-[11px] text-[#64748B]">{order.note}</p>{/if}
						{#if task && task.status !== 'received'}
							<p class="text-[11px] text-[#64748B]">On the patient to-do list</p>
						{:else}
							<p class="text-[11px] text-emerald-700">Recorded on the vaccination card</p>
						{/if}
						{#if shot?.proof_name}
							<a class="mt-2 block overflow-hidden rounded-lg border border-[#E2E8F0]" href="/files/vaccinations/{shot.id}" target="_blank" rel="noreferrer">
								<img class="max-h-40 w-full bg-white object-contain" src="/files/vaccinations/{shot.id}" alt="Proof for {order.title}" />
							</a>
						{/if}
					</div>
					<form method="POST" action="?/remove">
						<input type="hidden" name="id" value={order.id} />
						<button class="grid h-7 w-7 place-items-center rounded-lg text-[#64748B] hover:text-red-600" type="submit" aria-label="Remove vaccination">
							<span class="material-symbols-outlined text-base">close</span>
						</button>
					</form>
				</div>
			{:else}
				<p class="text-sm text-[#64748B]">No vaccinations given or ordered yet.</p>
			{/each}
			{#if open === 'give'}
				<form class="space-y-2" method="POST" action="?/give" enctype="multipart/form-data">
					<input class="field" name="name" placeholder="Vaccination" required maxlength="120" />
					<label class="block text-sm font-semibold" for="vax-given">
						Date given
						<input class="field mt-1" id="vax-given" name="given_on" type="date" required max={data.today} value={data.today} />
					</label>
					<input class="field" name="site" placeholder="Site, such as left deltoid" maxlength="80" />
					<input class="field" name="lot" placeholder="Lot, optional" maxlength="40" />
					<input class="field" name="note" placeholder="Note, optional" maxlength="500" />
					<div>
						<p class="text-sm font-semibold">
							Photo of the record
							<span class="font-normal text-[#64748B]">optional</span>
						</p>
						<label class="btn mt-1" for="vax-proof">Choose file</label>
						<input
							class="sr-only"
							id="vax-proof"
							name="proof"
							type="file"
							accept="image/jpeg,image/png,image/gif,image/webp"
							onchange={(event) => (proofName = event.currentTarget.files?.[0]?.name ?? '')}
						/>
						{#if proofName}<p class="mt-1 text-xs text-[#64748B]">{proofName}</p>{/if}
					</div>
					<button class="btn" type="submit">Record vaccination</button>
				</form>
			{/if}
			{#if open === 'order'}
				<form class="space-y-2" method="POST" action="?/orderVaccine">
					<input class="field" name="name" placeholder="Vaccination" required maxlength="120" />
					<input class="field" name="detail" placeholder="Where to get it, or any timing" maxlength="160" />
					<input class="field" name="note" placeholder="Note for the patient" maxlength="500" />
					<button class="btn" type="submit">Add to patient to-do list</button>
				</form>
			{/if}
		</div>
	</section>

	<article class="card space-y-3">
		<div>
			<h2 class="display text-sm font-bold">Bill</h2>
			<p class="mt-1 text-xs text-[#64748B]">Enter the total for this consultation. List each charge only when the patient should see a breakdown.</p>
		</div>
		<input type="hidden" form="finalize" name="bill_mode" value={itemized ? 'items' : 'total'} />
		<label class="flex items-center gap-2 text-sm font-semibold">
			<input type="checkbox" bind:checked={itemized} />
			List each charge
		</label>
		{#if itemized}
			<div class="space-y-2">
				{#each billLines as line, index}
					<div class="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-end gap-2">
						<label class="block text-sm font-semibold">
							{#if index === 0}Charge <span class="text-red-600" aria-hidden="true">*</span>{/if}
							<input class="field mt-1" form="finalize" name="item_description" required maxlength="120" aria-label="Charge" bind:value={line.description} placeholder="Consultation fee" />
						</label>
						<label class="block text-sm font-semibold">
							{#if index === 0}Amount <span class="text-red-600" aria-hidden="true">*</span>{/if}
							<input class="field mt-1" form="finalize" name="item_amount" type="number" inputmode="decimal" min="0" max="1000000" step="0.01" required aria-label="Amount" bind:value={line.amount} placeholder="0.00" />
						</label>
						<button
							class="grid h-10 w-10 place-items-center rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600"
							type="button"
							aria-label="Remove charge"
							onclick={() => {
								billLines = billLines.filter((_, item) => item !== index);
								if (!billLines.length) billLines = [{ description: '', amount: '' }];
							}}
						>
							<span class="material-symbols-outlined text-[18px]">close</span>
						</button>
					</div>
				{/each}
			</div>
			<div class="flex items-center justify-between gap-3">
				<button class="btn-sm" type="button" onclick={() => (billLines = [...billLines, { description: '', amount: '' }])}>Add a charge</button>
				<p class="text-sm font-semibold">Total <span class="nums">{money(itemSum)}</span></p>
			</div>
		{:else}
			<label class="block text-sm font-semibold" for="bill-total">
				Total <span class="text-red-600" aria-hidden="true">*</span>
				<input class="field mt-1" id="bill-total" form="finalize" name="bill_total" type="number" inputmode="decimal" min="0" max="1000000" step="0.01" required bind:value={billTotal} placeholder="0.00" />
			</label>
		{/if}
	</article>

	<article class="card space-y-3">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="display flex items-center gap-2 text-sm font-bold">
					<span class="grid h-7 w-7 place-items-center rounded-lg border border-brand-tint bg-brand-soft text-brand">
						<span class="material-symbols-outlined text-[18px]">article</span>
					</span>
					Medical certificate
				</h2>
				<p class="mt-1 text-xs text-[#64748B]">Optional. Certify the reason, the rest or sick-leave period, and the date before you end this consultation.</p>
			</div>
			{#if !data.certificate || certOpen}
				<button
					class="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white"
					type="button"
					onclick={() => (certOpen = !certOpen)}
				>
					<span class="material-symbols-outlined text-base">{certOpen ? 'close' : 'add'}</span>
					{certOpen ? 'Close' : 'Issue certificate'}
				</button>
			{/if}
		</div>
		{#if data.certificate && !certOpen}
			<div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
				<p class="text-sm font-bold">Ready to issue</p>
				<p class="mt-1 text-sm">{data.certificate.reason}</p>
				<p class="mt-1 text-[11px] text-[#64748B]">
					Certified rest {formatDate(data.certificate.restFrom)} – {formatDate(data.certificate.restUntil)}
					{#if restDays(data.certificate.restFrom, data.certificate.restUntil)}
						· {restDays(data.certificate.restFrom, data.certificate.restUntil)} days
					{/if}
				</p>
				<p class="text-[11px] text-[#64748B]">Certificate date {formatDate(data.certificate.issuedOn)}</p>
				<p class="mt-1 text-[11px] text-[#64748B]">It is filed on the chart when you finalize this consultation.</p>
				<div class="mt-2 flex gap-2">
					<button class="btn-sm" type="button" onclick={() => (certOpen = true)}>Edit</button>
					<form method="POST" action="?/removeCertificate" onsubmit={(event) => { if (!confirm('Remove this medical certificate from the consultation?')) event.preventDefault(); }}>
						<button class="btn-sm-line" type="submit">Remove</button>
					</form>
				</div>
			</div>
		{/if}
		{#if certOpen}
			<form class="space-y-3" method="POST" action="?/certificate">
				<label class="block text-sm font-semibold" for="cert-reason">
					Reason <span class="text-red-600" aria-hidden="true">*</span>
					<textarea class="field mt-1" id="cert-reason" name="reason" rows="3" required maxlength="500" bind:value={certReason} placeholder="Unfit for work because of an acute illness"></textarea>
				</label>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-sm font-semibold" for="cert-from">
						Rest starts <span class="text-red-600" aria-hidden="true">*</span>
						<input class="field mt-1" id="cert-from" name="rest_from" type="date" required bind:value={certFrom} />
					</label>
					<label class="block text-sm font-semibold" for="cert-until">
						Rest ends <span class="text-red-600" aria-hidden="true">*</span>
						<input class="field mt-1" id="cert-until" name="rest_until" type="date" required bind:value={certUntil} />
					</label>
				</div>
				{#if certifiedDays}
					<p class="text-xs text-[#64748B]">{certifiedDays} {certifiedDays === 1 ? 'day' : 'days'} of certified rest, including both dates.</p>
				{/if}
				<label class="block text-sm font-semibold" for="cert-date">
					Certificate date <span class="text-red-600" aria-hidden="true">*</span>
					<input class="field mt-1" id="cert-date" name="issued_on" type="date" required bind:value={certDate} />
				</label>
				<button class="btn" type="submit">Save certificate</button>
			</form>
		{/if}
	</article>

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
