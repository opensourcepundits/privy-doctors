<script lang="ts">
	import { page } from '$app/state';
	import Mention from '#lib/components/Mention.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { dayRelation, formatLongDate, formatTime, isoDate, toLive } from '#lib/format';
	import { WEEKDAYS, formatClock, groupByWeekday, type OpenSlot } from '#lib/schedule';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let board = $state<null | Awaited<PageProps['data']['board']>>(null);
	let boardFailed = $state(false);
	let query = $state('');
	let specialty = $state('All');
	let gender = $state('All');
	let chosenId = $state<number | null>(null);
	let focused = false;
	let bookingsOpen = $state(false);
	let kindByDoctor = $state<Record<number, 'clinic' | 'home'>>({});
	let dateByDoctor = $state<Record<number, string>>({});
	let monthByDoctor = $state<Record<number, string>>({});
	let slotByDoctor = $state<Record<number, string>>({});
	let detail = $state<HTMLElement | null>(null);

	const specialties = $derived([...new Set((board?.doctors ?? []).map((doctor) => doctor.specialty))].sort());
	const filtered = $derived(
		(board?.doctors ?? []).filter((doctor) => {
			const needle = query.trim().toLowerCase().replace(/\./g, '');
			const name = doctor.name.toLowerCase().replace(/\./g, '');
			const nameOk = !needle || name.includes(needle);
			const specialtyOk = specialty === 'All' || doctor.specialty === specialty;
			const genderOk = gender === 'All' || doctor.gender === gender;
			return nameOk && specialtyOk && genderOk;
		})
	);
	const chosen = $derived(filtered.find((doctor) => doctor.id === chosenId) ?? null);
	const filtering = $derived(query.trim() !== '' || specialty !== 'All' || gender !== 'All');

	function monogram(name: string) {
		const parts = name.replace(/^Dr\.\s+/i, '').split(/\s+/).filter(Boolean);
		return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
	}

	function kindFor(doctorId: number, hasClinic: boolean) {
		return kindByDoctor[doctorId] ?? (hasClinic ? 'clinic' : 'home');
	}

	function setKind(doctorId: number, kind: 'clinic' | 'home') {
		kindByDoctor[doctorId] = kind;
		dateByDoctor[doctorId] = '';
		slotByDoctor[doctorId] = '';
	}

	function choose(doctorId: number) {
		chosenId = chosenId === doctorId ? null : doctorId;
	}

	function clearSearch() {
		query = '';
		specialty = 'All';
		gender = 'All';
	}

	function liveIso(seed: string) {
		return isoDate(toLive(seed));
	}

	function monthTitle(month: string) {
		const [year, index] = month.split('-').map(Number);
		return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, index - 1, 1));
	}

	function calendarCells(month: string) {
		const [year, index] = month.split('-').map(Number);
		const first = new Date(year, index - 1, 1).getDay();
		const count = new Date(year, index, 0).getDate();
		const cells: (string | null)[] = Array.from({ length: first }, () => null);
		const pad = (part: number) => String(part).padStart(2, '0');
		for (let day = 1; day <= count; day += 1) cells.push(`${year}-${pad(index)}-${pad(day)}`);
		return cells;
	}

	function viewedMonth(doctorId: number, slots: OpenSlot[]) {
		const keys = slots.map((slot) => liveIso(slot.date)).sort();
		const first = keys[0]?.slice(0, 7) ?? '';
		const last = keys.at(-1)?.slice(0, 7) ?? first;
		const stored = monthByDoctor[doctorId];
		const month = stored && stored >= first && stored <= last ? stored : first;
		return { month, first, last };
	}

	function moveMonth(doctorId: number, month: string, delta: number, first: string, last: string) {
		const [year, index] = month.split('-').map(Number);
		const date = new Date(year, index - 1 + delta, 1);
		const pad = (part: number) => String(part).padStart(2, '0');
		const next = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
		if (next < first || next > last) return;
		monthByDoctor[doctorId] = next;
	}

	function pickDate(doctorId: number, seed: string) {
		dateByDoctor[doctorId] = seed;
		slotByDoctor[doctorId] = '';
	}

	function nextOpen(slots: OpenSlot[]) {
		const slot = slots[0];
		return slot ? `${slot.dateLabel} · ${slot.timeLabel}` : 'No open times in the next three weeks';
	}

	$effect.pre(() => {
		if (focused) return;
		const focus = Number(page.url.searchParams.get('doctor'));
		if (!Number.isInteger(focus) || focus < 1) return;
		focused = true;
		chosenId = focus;
	});

	$effect(() => {
		let on = true;
		board = null;
		boardFailed = false;
		data.board.then(
			(value) => {
				if (on) board = value;
			},
			() => {
				if (on) boardFailed = true;
			}
		);
		return () => {
			on = false;
		};
	});

	$effect(() => {
		if (!chosen) return;
		detail?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	});
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient">Home</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">Book an appointment</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">Search the clinicians, choose a date, then a time. Visits are 30 minutes.</p>
</header>

{#if form?.message}
	<p class="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 lg:mx-0">{form.message}</p>
{/if}

{#if boardFailed}
	<p class="px-4 pt-4 text-sm text-[#64748B] lg:px-0">The clinicians could not be loaded.</p>
{:else if !board}
	<div class="px-4 py-4 lg:px-0"><Skeleton count={4} /></div>
{:else}
{#if board.today.length || board.upcoming.length}
	<section class="px-4 pt-4 lg:px-0">
		<button
			class="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-left lg:hidden"
			type="button"
			aria-expanded={bookingsOpen}
			onclick={() => (bookingsOpen = !bookingsOpen)}
		>
			<span>
				<span class="display block text-lg font-semibold">Already booked</span>
				<span class="text-sm text-[#64748B]">{board.today.length} today · {board.upcoming.length} upcoming</span>
			</span>
			<span class="material-symbols-outlined text-brand" aria-hidden="true">{bookingsOpen ? 'expand_less' : 'expand_more'}</span>
		</button>
		<div class="{bookingsOpen ? 'mt-3 grid' : 'hidden'} gap-3 lg:mt-0 lg:grid lg:grid-cols-2">
			{#each [...board.today, ...board.upcoming] as visit}
				<article class="card !py-3">
					<p class="kicker">{dayRelation(visit.starts_at)} · {visit.title}</p>
					<p class="mt-1 font-semibold">{formatLongDate(visit.starts_at)}</p>
					<p class="text-sm">{formatTime(visit.starts_at)} · {visit.duration_min} min · <Mention text={visit.doctor_name} /></p>
					<p class="text-sm text-[#64748B]">{visit.location}</p>
				</article>
			{/each}
		</div>
	</section>
{/if}

<section class="px-4 py-4 lg:px-0">
	<div class="card lg:flex lg:items-end lg:gap-3 lg:p-4">
		<label class="relative block lg:min-w-0 lg:flex-1">
			<span class="material-symbols-outlined field-icon text-[#64748B]" aria-hidden="true">search</span>
			<input class="field field-search !pr-3" bind:value={query} placeholder="Search by doctor name" autocomplete="off" />
		</label>
		<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:w-[28rem] lg:shrink-0">
			<label class="relative block" for="specialty">
				<span class="pointer-events-none absolute top-2.5 left-3.5 text-[0.68rem] font-bold tracking-[0.08em] text-[#64748B] uppercase lg:hidden">Specialty</span>
				<select
					class="h-16 w-full appearance-none rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] pt-6 pr-12 pb-2 pl-3.5 text-sm font-semibold text-[#0F172A] outline-none select-brand lg:h-11 lg:rounded-xl lg:py-0 lg:pr-10 lg:pl-3"
					id="specialty"
					aria-label="Specialty"
					bind:value={specialty}
				>
					<option value="All">All specialties</option>
					{#each specialties as item}
						<option value={item}>{item}</option>
					{/each}
				</select>
				<span class="material-symbols-outlined pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand" aria-hidden="true">expand_more</span>
			</label>
			<label class="relative block" for="gender">
				<span class="pointer-events-none absolute top-2.5 left-3.5 text-[0.68rem] font-bold tracking-[0.08em] text-[#64748B] uppercase lg:hidden">Gender</span>
				<select
					class="h-16 w-full appearance-none rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] pt-6 pr-12 pb-2 pl-3.5 text-sm font-semibold text-[#0F172A] outline-none select-brand lg:h-11 lg:rounded-xl lg:py-0 lg:pr-10 lg:pl-3"
					id="gender"
					aria-label="Gender"
					bind:value={gender}
				>
					<option value="All">Anyone</option>
					<option value="Female">Female</option>
					<option value="Male">Male</option>
				</select>
				<span class="material-symbols-outlined pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-brand" aria-hidden="true">expand_more</span>
			</label>
		</div>
	</div>
	<div class="mt-3 flex items-center justify-between gap-3 text-sm">
		<p class="text-[#64748B]">{filtered.length} {filtered.length === 1 ? 'clinician' : 'clinicians'}</p>
		{#if filtering}
			<button class="font-semibold text-brand" type="button" onclick={clearSearch}>Clear search</button>
		{/if}
	</div>

	<div class="mt-3 {chosen ? 'lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6' : ''}">
		{#if filtered.length}
			<div class={chosen ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
				{#each filtered as doctor}
					{@const picked = chosen?.id === doctor.id}
					<div
						class="cursor-pointer text-left {chosen
							? `rounded-xl border px-3 py-2.5 ${picked ? 'border-brand bg-brand-soft' : 'border-[#E2E8F0] bg-white'}`
							: `card ${picked ? 'border-brand ring-2 ring-brand/15' : ''}`}"
						onclick={() => choose(doctor.id)}
					>
						<div class="flex items-center gap-3">
							<div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
								{monogram(doctor.name)}
							</div>
							<div class="min-w-0">
								<a class="display block truncate text-base font-bold text-[#0F172A] underline decoration-brand/30 underline-offset-2 hover:text-brand" href="/patient/doctors/{doctor.id}" onclick={(event) => event.stopPropagation()}>{doctor.name}</a>
								<p class="truncate text-sm text-[#64748B]">{chosen ? doctor.specialty : doctor.credentials}</p>
							</div>
						</div>
						{#if !chosen}
							<p class="mt-3 text-sm font-semibold text-brand">{doctor.specialty}</p>
							<p class="text-sm text-[#64748B]">{doctor.gender}</p>
							<p class="mt-2 text-sm">{nextOpen(doctor.slots)}</p>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="card text-sm text-[#64748B]">No clinicians match that search.</p>
		{/if}

		{#if chosen}
			{@const clinic = chosen.hours.filter((row) => row.kind === 'clinic')}
			{@const home = chosen.hours.filter((row) => row.kind === 'home')}
			{@const kind = kindFor(chosen.id, clinic.length > 0)}
			{@const slots = chosen.slots.filter((slot) => slot.kind === kind)}
			{@const openDays = new Map(slots.map((slot) => [liveIso(slot.date), slot.date]))}
			{@const calendar = viewedMonth(chosen.id, slots)}
			{@const pickedDate = dateByDoctor[chosen.id] ?? ''}
			{@const daySlots = slots.filter((slot) => slot.date === pickedDate)}
			{@const selected = daySlots.find((slot) => slot.startsAt === slotByDoctor[chosen.id])}
			<aside class="mt-4 lg:sticky lg:top-4 lg:mt-0" bind:this={detail}>
				<article class="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
					<div class="h-1 bg-brand"></div>
					<div class="space-y-5 p-4 lg:p-6">
						<div class="flex items-start gap-4">
							<div class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white">
								{monogram(chosen.name)}
							</div>
							<div class="min-w-0">
								<p class="kicker">{chosen.specialty} · {chosen.gender}</p>
								<h2 class="display mt-1 text-2xl font-bold"><a class="underline decoration-brand/30 underline-offset-2" href="/patient/doctors/{chosen.id}">{chosen.name}</a></h2>
								<p class="text-sm">{chosen.credentials}</p>
								<p class="mt-1 text-sm text-[#64748B]">{chosen.practice}</p>
								<p class="text-sm text-[#64748B]">{chosen.location}</p>
							</div>
						</div>

						<div class="grid gap-4 rounded-xl bg-[#F8FAFC] p-3 sm:grid-cols-2">
							<div>
								<p class="kicker">Clinic hours</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each groupByWeekday(clinic) as day}
										<li>{WEEKDAYS[day.weekday].slice(0, 3)} · {day.rows.map((row) => `${formatClock(row.start_time)}–${formatClock(row.end_time)}`).join(', ')}</li>
									{:else}
										<li class="text-[#64748B]">None published.</li>
									{/each}
								</ul>
							</div>
							<div>
								<p class="kicker">At-home visits</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each groupByWeekday(home) as day}
										<li>{WEEKDAYS[day.weekday].slice(0, 3)} · {day.rows.map((row) => `${formatClock(row.start_time)}–${formatClock(row.end_time)}`).join(', ')}</li>
									{:else}
										<li class="text-[#64748B]">None published.</li>
									{/each}
								</ul>
							</div>
						</div>

						<form class="grid gap-4" method="POST" action="?/book">
							<input type="hidden" name="doctor_id" value={chosen.id} />
							<input type="hidden" name="kind" value={kind} />
							<input type="hidden" name="starts_at" value={selected?.startsAt ?? ''} />

							{#if clinic.length && home.length}
								<div class="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F5F9] p-1">
									<button
										class="h-10 rounded-lg text-sm font-semibold {kind === 'clinic' ? 'bg-white text-brand shadow-sm' : 'text-[#64748B]'}"
										type="button"
										onclick={() => setKind(chosen.id, 'clinic')}
									>
										Clinic
									</button>
									<button
										class="h-10 rounded-lg text-sm font-semibold {kind === 'home' ? 'bg-white text-brand shadow-sm' : 'text-[#64748B]'}"
										type="button"
										onclick={() => setKind(chosen.id, 'home')}
									>
										At home
									</button>
								</div>
							{:else}
								<p class="font-semibold">{kind === 'home' ? 'At-home times' : 'Clinic times'}</p>
							{/if}

							{#if calendar.month}
								<div>
									<div class="mb-3 flex items-center justify-between">
										<button
											class="grid h-9 w-9 place-items-center rounded-lg text-brand disabled:text-[#CBD5E1]"
											type="button"
											aria-label="Previous month"
											disabled={calendar.month <= calendar.first}
											onclick={() => moveMonth(chosen.id, calendar.month, -1, calendar.first, calendar.last)}
										>
											<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
										</button>
										<p class="text-sm font-semibold">{monthTitle(calendar.month)}</p>
										<button
											class="grid h-9 w-9 place-items-center rounded-lg text-brand disabled:text-[#CBD5E1]"
											type="button"
											aria-label="Next month"
											disabled={calendar.month >= calendar.last}
											onclick={() => moveMonth(chosen.id, calendar.month, 1, calendar.first, calendar.last)}
										>
											<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
										</button>
									</div>
									<div class="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-bold tracking-wide text-[#64748B] uppercase">
										{#each WEEKDAYS as weekday}
											<span>{weekday.slice(0, 2)}</span>
										{/each}
									</div>
									<div class="mt-1 grid grid-cols-7 gap-1">
										{#each calendarCells(calendar.month) as cell}
											{#if cell}
												{@const seed = openDays.get(cell)}
												<button
													class="h-10 rounded-lg text-sm font-semibold {seed && pickedDate === seed
														? 'bg-brand text-white'
														: seed
															? 'bg-brand-soft text-brand hover:bg-brand hover:text-white'
															: 'text-[#CBD5E1]'}"
													type="button"
													disabled={!seed}
													aria-pressed={pickedDate === seed}
													aria-label={seed ? formatLongDate(seed) : undefined}
													onclick={() => seed && pickDate(chosen.id, seed)}
												>
													{Number(cell.slice(8))}
												</button>
											{:else}
												<span></span>
											{/if}
										{/each}
									</div>
								</div>
								{#if daySlots.length}
									<div>
										<p class="text-sm font-semibold">{formatLongDate(pickedDate)}</p>
										<div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
											{#each daySlots as slot}
												<button
													class="h-10 rounded-lg text-sm font-semibold {slotByDoctor[chosen.id] === slot.startsAt
														? 'bg-brand text-white'
														: 'bg-[#F1F5F9] text-[#0F172A] hover:bg-brand-soft'}"
													type="button"
													onclick={() => (slotByDoctor[chosen.id] = slot.startsAt)}
												>
													{slot.timeLabel}
												</button>
											{/each}
										</div>
									</div>
								{:else}
									<p class="text-sm text-[#64748B]">Choose a highlighted date. Open days are shown for the next three weeks.</p>
								{/if}
								<label class="block text-sm font-semibold" for="reason-{chosen.id}">
									A note for your doctor
									<textarea class="field mt-1 !min-h-24" id="reason-{chosen.id}" name="reason" placeholder="Share how you’ve been feeling, or what you’d like to talk about."></textarea>
								</label>
								<div class="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 lg:flex-row lg:items-center lg:justify-between">
									<p class="text-sm text-[#64748B]">{selected ? `${selected.dateLabel} · ${selected.timeLabel}` : pickedDate ? 'Choose a time to continue' : 'Choose a date to continue'}</p>
									<button class="btn disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!selected}>
										Book this time
									</button>
								</div>
							{:else}
								<p class="text-sm text-[#64748B]">No open times in the next three weeks.</p>
							{/if}
						</form>
					</div>
				</article>
			</aside>
		{/if}
	</div>
</section>
{/if}
