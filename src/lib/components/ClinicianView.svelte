<script lang="ts">
	import { WEEKDAYS, formatClock, groupByWeekday } from '#lib/schedule';

	let {
		doctor
	}: {
		doctor: {
			name: string;
			credentials: string;
			specialty: string;
			gender: string;
			practice: string;
			location: string;
			phone: string | null;
			hours: { kind: string; weekday: number; start_time: string; end_time: string }[];
		};
	} = $props();

	const clinic = $derived(doctor.hours.filter((row) => row.kind === 'clinic'));
	const home = $derived(doctor.hours.filter((row) => row.kind === 'home'));
</script>

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">{doctor.specialty} · {doctor.gender}</p>
	<h1 class="display mt-1 text-2xl font-bold lg:text-3xl">{doctor.name}</h1>
	<p class="text-sm text-[#64748B]">{doctor.credentials}</p>
</header>

<section class="grid gap-4 px-4 py-4 lg:grid-cols-2 lg:px-0">
	<article class="card space-y-2 text-sm lg:col-span-2">
		<p><span class="text-[#64748B]">Practice</span><br />{doctor.practice}</p>
		<p><span class="text-[#64748B]">Location</span><br />{doctor.location}</p>
		<p><span class="text-[#64748B]">Phone</span><br />{doctor.phone || 'Not published'}</p>
	</article>
	<article class="card">
		<p class="kicker">Clinic hours</p>
		<ul class="mt-2 space-y-1 text-sm">
			{#each groupByWeekday(clinic) as day}
				<li>{WEEKDAYS[day.weekday]} · {day.rows.map((row) => `${formatClock(row.start_time)}–${formatClock(row.end_time)}`).join(', ')}</li>
			{:else}
				<li class="text-[#64748B]">No clinic hours published.</li>
			{/each}
		</ul>
	</article>
	<article class="card">
		<p class="kicker">At-home visits</p>
		<ul class="mt-2 space-y-1 text-sm">
			{#each groupByWeekday(home) as day}
				<li>{WEEKDAYS[day.weekday]} · {day.rows.map((row) => `${formatClock(row.start_time)}–${formatClock(row.end_time)}`).join(', ')}</li>
			{:else}
				<li class="text-[#64748B]">No at-home hours published.</li>
			{/each}
		</ul>
	</article>
</section>
