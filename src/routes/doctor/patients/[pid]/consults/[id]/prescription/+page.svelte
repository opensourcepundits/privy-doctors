<script lang="ts">
	import { enhance } from '$app/forms';
	import DoseMarks from '#lib/components/DoseMarks.svelte';
	import { frequencyTags, mealTags, tagsFrom } from '#lib/doses';
	import { formatDate, isoDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let open = $state(false);
	let medQuery = $state('');
	let medNote = $state('');
	let medList = $state(false);
	let frequency = $state('');
	let meal = $state('');
	let completesOn = $state('');
	let loadedId = 0;
	let photoName = $state('');

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

	$effect.pre(() => {
		const next = isoDate(data.consult.completes_on);
		if (loadedId === data.consult.id) return;
		loadedId = data.consult.id;
		completesOn = next;
	});

	const meds = $derived(data.consult.orders.filter((order) => order.kind === 'medication'));
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href="/doctor/patients/{data.patient.pid}/consults/{data.consult.id}">
		<span class="material-symbols-outlined text-base">arrow_back</span> Consultation
	</a>
	<p class="kicker mt-3">Signed · {data.consult.code}</p>
	<h1 class="display text-2xl font-bold">Edit prescription</h1>
	<p class="text-sm text-[#64748B]">{data.patient.first_name} {data.patient.last_name} · {data.patient.pid}</p>
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}

	<article class="card space-y-3">
		<div class="flex items-center justify-between gap-2">
			<h2 class="display text-sm font-bold">Typed medicines</h2>
			<button
				class="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white"
				type="button"
				onclick={() => {
					open = !open;
					if (open) {
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
			<p class="text-sm text-[#64748B]">No medicines typed on this consultation yet.</p>
		{/each}
		{#if open}
			<form
				class="space-y-3 rounded-xl border border-dashed border-[#CBD5E1] p-3"
				method="POST"
				action="?/medication"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							frequency = '';
							meal = '';
							medQuery = '';
							medNote = '';
							medList = false;
							open = false;
						}
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
					Medicine completion date
					<span class="font-normal text-[#64748B]">optional</span>
					<input class="field mt-1" name="completes_on" type="date" />
				</label>
				<label class="block text-sm font-semibold">
					Prescription completion date
					<input class="field mt-1" name="prescription_completes_on" type="date" required bind:value={completesOn} />
				</label>
				<button class="btn" type="submit">Save medication</button>
			</form>
		{/if}
	</article>

	<article class="card space-y-3">
		<h2 class="display text-sm font-bold">Photograph of the written prescription</h2>
		<p class="text-xs text-[#64748B]">Upload a photo instead of typing each medicine.</p>
		{#each data.consult.photos as photo}
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
		{:else}
			<p class="text-sm text-[#64748B]">No photo attached.</p>
		{/each}
		<form class="flex flex-wrap items-center gap-2" method="POST" action="?/photo" enctype="multipart/form-data">
			<label class="btn-sm" for="prescription-photo">Choose photo</label>
			<input
				class="sr-only"
				id="prescription-photo"
				name="photo"
				type="file"
				accept="image/*"
				required
				onchange={(event) => {
					photoName = event.currentTarget.files?.[0]?.name ?? '';
				}}
			/>
			{#if photoName}<span class="text-xs text-[#64748B]">{photoName}</span>{/if}
			<button class="btn-sm" type="submit">Upload photo</button>
		</form>
	</article>
</section>
