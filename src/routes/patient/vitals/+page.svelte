<script lang="ts">
	import { formatDate, formatTime } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const latest = $derived(data.vitals.at(-1));
	const maxSys = $derived(Math.max(...data.vitals.map((row) => row.systolic ?? 0)));
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-[#0D7377]" href="/patient">Home</a>
	<h1 class="display mt-2 text-2xl font-bold">Vitals and health stats</h1>
	<p class="text-sm text-[#64748B]">{data.patient.first_name} {data.patient.last_name} · biometric sync active</p>
</header>

<section class="space-y-3 px-4 py-4">
	{#if latest}
		<div class="grid grid-cols-2 gap-3">
			<article class="card">
				<p class="kicker">Blood pressure</p>
				<p class="display nums text-3xl font-bold">{latest.systolic}/{latest.diastolic}</p>
				<p class="text-xs text-emerald-700">Target 110–125 / 70–80</p>
			</article>
			<article class="card">
				<p class="kicker">Resting HR</p>
				<p class="display nums text-3xl font-bold">{latest.heart_rate}</p>
				<p class="text-xs text-[#64748B]">{formatTime(latest.recorded_at)}</p>
			</article>
		</div>
	{/if}
	<article class="card">
		<p class="font-semibold">Blood pressure this month</p>
		<div class="mt-3 flex h-28 items-end gap-2">
			{#each data.vitals as row}
				<div class="flex flex-1 flex-col items-center gap-1">
					<div class="w-full rounded-t bg-[#0D7377]" style="height: {(row.systolic / maxSys) * 100}%"></div>
					<span class="text-[10px] text-[#64748B]">{formatDate(row.recorded_at).split(',')[0]}</span>
				</div>
			{/each}
		</div>
	</article>
	{#each data.labs as lab}
		<article class="card">
			<p class="text-xs text-[#64748B]">{formatDate(lab.collected_on)} · {lab.facility}</p>
			<p class="font-semibold">{lab.name}</p>
			<p class="text-sm">{lab.results.map((result) => `${result.name} ${result.value_text ?? result.value_num}`).slice(0, 3).join(' · ')}</p>
		</article>
	{/each}
	<form class="card space-y-2" method="POST" action="?/log">
		<p class="font-semibold">Log today’s at-home vitals</p>
		<input class="field" name="systolic" inputmode="numeric" placeholder="Systolic" required />
		<input class="field" name="diastolic" inputmode="numeric" placeholder="Diastolic" required />
		<input class="field" name="heartRate" inputmode="numeric" placeholder="Heart rate" required />
		<select class="field" name="source">
			<option>Omron home cuff</option>
			<option>Manual / clinic</option>
		</select>
		{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
		<button class="btn" type="submit">Save and transmit reading</button>
	</form>
</section>
