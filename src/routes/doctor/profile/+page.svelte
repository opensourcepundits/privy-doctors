<script lang="ts">
	import { WEEKDAYS, formatClock, groupByWeekday } from '#lib/schedule';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const clinicHours = $derived(data.hours.filter((row) => row.kind === 'clinic'));
	const homeHours = $derived(data.hours.filter((row) => row.kind === 'home'));
	const clinicDays = $derived(groupByWeekday(clinicHours));
	const homeDays = $derived(groupByWeekday(homeHours));

	function blankRanges(rows: typeof data.hours, weekday: number) {
		const saved = rows.filter((row) => row.weekday === weekday);
		return {
			shown: Math.min(3, Math.max(1, saved.length)),
			starts: [0, 1, 2].map((index) => saved[index]?.start_time.slice(0, 5) ?? ''),
			ends: [0, 1, 2].map((index) => saved[index]?.end_time.slice(0, 5) ?? '')
		};
	}

	let clinicDay = $state(1);
	let clinicShown = $state(1);
	let clinicStarts = $state(['', '', '']);
	let clinicEnds = $state(['', '', '']);
	let homeDay = $state(2);
	let homeShown = $state(1);
	let homeStarts = $state(['', '', '']);
	let homeEnds = $state(['', '', '']);
	let editing = $state(false);

	$effect(() => {
		if (form?.details) editing = true;
	});

	$effect(() => {
		const next = blankRanges(clinicHours, Number(clinicDay));
		clinicShown = next.shown;
		clinicStarts = next.starts;
		clinicEnds = next.ends;
	});

	$effect(() => {
		const next = blankRanges(homeHours, Number(homeDay));
		homeShown = next.shown;
		homeStarts = next.starts;
		homeEnds = next.ends;
	});
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Clinician</p>
	<h1 class="display text-2xl font-bold">{data.doctor.name}</h1>
	<p class="text-sm text-[#64748B]">{data.doctor.credentials} · {data.doctor.specialty}</p>
</header>

{#if form?.message}
	<p class="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 lg:mx-0">{form.message}</p>
{/if}

<section class="grid gap-4 px-4 py-4 lg:grid-cols-2 lg:px-0">
	<article class="card space-y-2 text-sm lg:col-span-2">
		<p><span class="text-[#64748B]">Practice</span><br />{data.doctor.practice}</p>
		<p><span class="text-[#64748B]">Location</span><br />{data.doctor.location}</p>
		<p><span class="text-[#64748B]">Concierge line</span><br />{data.doctor.phone || '—'}</p>
		{#if !editing}
			<button class="btn mt-3" type="button" onclick={() => (editing = true)}>Edit details</button>
		{:else}
			<form class="mt-3 grid gap-3 border-t border-[#E2E8F0] pt-3" method="POST" action="?/save">
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block font-semibold" for="profile-name">
						Name
						<input class="field mt-1" id="profile-name" name="name" required value={form?.name ?? data.doctor.name} />
					</label>
					<label class="block font-semibold" for="profile-credentials">
						Credentials
						<input class="field mt-1" id="profile-credentials" name="credentials" required value={form?.credentials ?? data.doctor.credentials} />
					</label>
				</div>
				<label class="block font-semibold" for="profile-specialty">
					Specialty
					<input class="field mt-1" id="profile-specialty" name="specialty" required value={form?.specialty ?? data.doctor.specialty} />
				</label>
				<label class="block font-semibold" for="profile-practice">
					Practice
					<input class="field mt-1" id="profile-practice" name="practice" required value={form?.practice ?? data.doctor.practice} />
				</label>
				<label class="block font-semibold" for="profile-location">
					Location
					<input class="field mt-1" id="profile-location" name="location" required value={form?.location ?? data.doctor.location} />
				</label>
				<label class="block font-semibold" for="profile-phone">
					Phone number
					<input class="field mt-1" id="profile-phone" name="phone" type="tel" autocomplete="tel" value={form?.phone ?? data.doctor.phone ?? ''} />
				</label>
				<div class="flex flex-col gap-3 sm:flex-row">
					<button class="btn" type="submit">Save details</button>
					<button class="btn-line" type="button" onclick={() => (editing = false)}>Cancel</button>
				</div>
			</form>
		{/if}
	</article>

	<article class="card">
		<p class="kicker">Clinic consultation hours</p>
		<p class="mt-1 text-sm text-[#64748B]">Patients book office visits inside these hours. A day can have one, two, or three separate ranges, such as 8:00–12:00, 2:00–5:00, and 8:00–9:00. Each visit is 30 minutes.</p>
		<ul class="mt-3 space-y-2 text-sm">
			{#each clinicDays as day}
				<li class="rounded-xl bg-[#F8FAFC] px-3 py-2">
					<p class="font-semibold">{WEEKDAYS[day.weekday]}</p>
					<ul class="mt-1 space-y-1">
						{#each day.rows as row}
							<li class="flex items-center justify-between gap-3">
								<span>{formatClock(row.start_time)} to {formatClock(row.end_time)}</span>
								<form method="POST" action="?/remove">
									<input type="hidden" name="id" value={row.id} />
									<button class="font-semibold text-brand" type="submit">Remove</button>
								</form>
							</li>
						{/each}
					</ul>
				</li>
			{:else}
				<li class="text-[#64748B]">No clinic hours yet.</li>
			{/each}
		</ul>
		<form class="mt-4 grid gap-3" method="POST" action="?/add">
			<input type="hidden" name="kind" value="clinic" />
			<label class="block text-sm font-semibold" for="clinic-day">
				Day
				<select class="field mt-1" id="clinic-day" name="weekday" bind:value={clinicDay}>
					{#each WEEKDAYS as day, index}
						<option value={index}>{day}</option>
					{/each}
				</select>
			</label>
			{#each [0, 1, 2] as index}
				{#if index < clinicShown}
					<fieldset class="grid grid-cols-2 gap-2">
						<legend class="col-span-2 text-sm font-semibold">Range {index + 1}</legend>
						<label class="block text-sm font-semibold" for="clinic-start-{index}">
							From
							<input class="field mt-1" id="clinic-start-{index}" name="start" type="time" required bind:value={clinicStarts[index]} />
						</label>
						<label class="block text-sm font-semibold" for="clinic-end-{index}">
							To
							<input class="field mt-1" id="clinic-end-{index}" name="end" type="time" required bind:value={clinicEnds[index]} />
						</label>
					</fieldset>
				{/if}
			{/each}
			<div class="flex flex-wrap gap-3 text-sm font-semibold">
				{#if clinicShown < 3}
					<button class="text-brand" type="button" onclick={() => (clinicShown += 1)}>Add another range</button>
				{/if}
				{#if clinicShown > 1}
					<button class="text-[#64748B]" type="button" onclick={() => (clinicShown -= 1)}>Remove last range</button>
				{/if}
			</div>
			<p class="text-xs text-[#64748B]">Saving replaces the ranges already stored for this day.</p>
			<button class="btn btn-block" type="submit">Save clinic hours</button>
		</form>
	</article>

	<article class="card">
		<p class="kicker">At-home visitation</p>
		<p class="mt-1 text-sm text-[#64748B]">A day can have one, two, or three separate ranges for home visits.</p>
		<ul class="mt-3 space-y-2 text-sm">
			{#each homeDays as day}
				<li class="rounded-xl bg-[#F8FAFC] px-3 py-2">
					<p class="font-semibold">{WEEKDAYS[day.weekday]}</p>
					<ul class="mt-1 space-y-1">
						{#each day.rows as row}
							<li class="flex items-center justify-between gap-3">
								<span>{formatClock(row.start_time)} to {formatClock(row.end_time)}</span>
								<form method="POST" action="?/remove">
									<input type="hidden" name="id" value={row.id} />
									<button class="font-semibold text-brand" type="submit">Remove</button>
								</form>
							</li>
						{/each}
					</ul>
				</li>
			{:else}
				<li class="text-[#64748B]">No at-home days yet.</li>
			{/each}
		</ul>
		<form class="mt-4 grid gap-3" method="POST" action="?/add">
			<input type="hidden" name="kind" value="home" />
			<label class="block text-sm font-semibold" for="home-day">
				Day
				<select class="field mt-1" id="home-day" name="weekday" bind:value={homeDay}>
					{#each WEEKDAYS as day, index}
						<option value={index}>{day}</option>
					{/each}
				</select>
			</label>
			{#each [0, 1, 2] as index}
				{#if index < homeShown}
					<fieldset class="grid grid-cols-2 gap-2">
						<legend class="col-span-2 text-sm font-semibold">Range {index + 1}</legend>
						<label class="block text-sm font-semibold" for="home-start-{index}">
							From
							<input class="field mt-1" id="home-start-{index}" name="start" type="time" required bind:value={homeStarts[index]} />
						</label>
						<label class="block text-sm font-semibold" for="home-end-{index}">
							To
							<input class="field mt-1" id="home-end-{index}" name="end" type="time" required bind:value={homeEnds[index]} />
						</label>
					</fieldset>
				{/if}
			{/each}
			<div class="flex flex-wrap gap-3 text-sm font-semibold">
				{#if homeShown < 3}
					<button class="text-brand" type="button" onclick={() => (homeShown += 1)}>Add another range</button>
				{/if}
				{#if homeShown > 1}
					<button class="text-[#64748B]" type="button" onclick={() => (homeShown -= 1)}>Remove last range</button>
				{/if}
			</div>
			<p class="text-xs text-[#64748B]">Saving replaces the ranges already stored for this day.</p>
			<button class="btn btn-block" type="submit">Save visitation hours</button>
		</form>
	</article>

	<div class="flex flex-col gap-3 lg:col-span-2 lg:flex-row">
		<a class="btn" href="/patient">Open Eleanor Vance's patient view</a>
		<form method="POST" action="/logout"><button class="btn-line" type="submit">Sign out</button></form>
	</div>
</section>
