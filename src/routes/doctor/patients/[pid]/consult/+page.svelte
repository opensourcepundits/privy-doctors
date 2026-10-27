<script lang="ts">
	import ConsultTimer from '#lib/components/ConsultTimer.svelte';
	import { ageOn, formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let modality = $state('in_person');
	let kind = $state('Vital Sign');
	let narrative = $state('');
	let loadedCode = '';

	$effect.pre(() => {
		if (loadedCode === data.consult.code) return;
		loadedCode = data.consult.code;
		modality = data.consult.modality || 'in_person';
		narrative = data.consult.narrative ?? '';
	});

	const modes = [
		['in_person', 'In-Person', 'stethoscope'],
		['telehealth', 'Telehealth', 'videocam'],
		['follow_up', 'Follow-up', 'history']
	] as const;

	const chips = ['Symptom', 'Vital Sign', 'Observation'] as const;

	function tagClass(value: string) {
		if (value === 'Symptom') return 'bg-amber-100 text-amber-900 border-amber-200';
		if (value === 'Vital Sign') return 'bg-teal-50 text-teal-800 border-teal-200';
		return 'bg-slate-200 text-slate-700 border-slate-300';
	}

	function rowClass(value: string) {
		if (value === 'Symptom') return 'border-amber-200 bg-amber-50/70';
		return 'border-[#E2E8F0] bg-[#F8FAFC]';
	}
</script>

<header class="flex items-center justify-between gap-3 px-4 pt-5 lg:px-0">
	<div class="flex min-w-0 items-center gap-2">
		<a class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#64748B] hover:bg-white" href="/doctor/patients/{data.patient.pid}" aria-label="Back to chart">
			<span class="material-symbols-outlined text-[22px]">arrow_back</span>
		</a>
		<div class="min-w-0">
			<h1 class="display truncate text-base font-bold lg:text-xl">Clinical intake and notes</h1>
			<p class="text-[11px] font-medium text-[#64748B]">Active consultation session</p>
		</div>
	</div>
	<ConsultTimer startedAt={data.consult.started_at} />
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	<article class="card">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="display text-lg font-bold">{data.patient.first_name} {data.patient.last_name}</h2>
			<span class="rounded-full border border-brand-tint bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{data.patient.pid}</span>
			<span class="rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">{data.consult.code}</span>
		</div>
		<p class="mt-1 text-xs font-medium text-[#64748B]">
			Age {ageOn(data.patient.dob)} · {data.patient.sex} · DOB {formatDate(data.patient.dob)}{data.patient.nic ? ` · NIC ${data.patient.nic}` : ''}{data.patient.passport ? ` · Passport ${data.patient.passport}` : ''}
		</p>
		<div class="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F1F5F9] p-1 text-center text-xs">
			{#each modes as [value, label, icon]}
				<label class="flex cursor-pointer items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] sm:text-xs {modality === value ? 'border border-[#E2E8F0] bg-white font-semibold text-brand shadow-sm' : 'text-[#64748B]'}">
					<input class="sr-only" type="radio" name="modality" value={value} form="continue" checked={modality === value} onchange={() => (modality = value)} />
					<span class="material-symbols-outlined text-[15px]">{icon}</span>
					{label}
				</label>
			{/each}
		</div>
	</article>

	<div class="grid items-start gap-4 lg:grid-cols-2">
		<div class="space-y-4">
			<article class="card">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h3 class="display text-[15px] font-bold">Consultation entries</h3>
						<p class="text-[11px] text-[#64748B]">Log vitals, symptoms, and exam findings</p>
					</div>
					<span class="shrink-0 rounded-full border border-brand-tint bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
						{data.consult.entries.length} items recorded
					</span>
				</div>
				<div class="mt-3 flex gap-2 overflow-x-auto">
					{#each chips as chip}
						<button class="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#334155]" type="button" onclick={() => (kind = chip)}>
							<span class="material-symbols-outlined text-[14px] text-brand">add</span>
							{chip}
						</button>
					{/each}
				</div>
				<form class="mt-3 space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3" method="POST" action="?/add">
					<p class="kicker">Add new log item</p>
					<div class="grid gap-2 sm:grid-cols-3">
						<select class="field sm:col-span-1" name="kind" bind:value={kind}>
							<option>Vital Sign</option>
							<option>Symptom</option>
							<option>Observation</option>
						</select>
						<input class="field sm:col-span-2" name="label" placeholder="e.g. SpO2 98% or mild dyspnea" required />
					</div>
					<input class="field" name="detail" placeholder="Context, such as sitting or post-exertion" />
					<div class="flex justify-end">
						<button class="btn" type="submit">
							<span class="material-symbols-outlined text-base">add</span>
							Add to log
						</button>
					</div>
					{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
				</form>
			</article>

			<article class="card">
				<h4 class="kicker">Recorded entries</h4>
				<div class="mt-3 space-y-2">
					{#each data.consult.entries as entry}
						<div class="flex items-center justify-between gap-2 rounded-xl border p-2.5 {rowClass(entry.kind)}">
							<div class="flex min-w-0 items-center gap-2">
								<span class="shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold {tagClass(entry.kind)}">{entry.kind}</span>
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold">{entry.label}</p>
									{#if entry.detail}<p class="truncate text-[11px] text-[#64748B]">{entry.detail}</p>{/if}
								</div>
							</div>
							<form method="POST" action="?/remove">
								<input type="hidden" name="id" value={entry.id} />
								<button class="grid h-7 w-7 place-items-center rounded-lg text-[#94A3B8] hover:bg-rose-50 hover:text-rose-600" type="submit" aria-label="Remove entry">
									<span class="material-symbols-outlined text-base">close</span>
								</button>
							</form>
						</div>
					{:else}
						<p class="text-sm text-[#64748B]">Nothing recorded yet. Add a vital, symptom, or observation.</p>
					{/each}
				</div>
			</article>
		</div>

		<article class="card">
			<div class="flex items-center justify-between gap-3">
				<h3 class="display flex items-center gap-1.5 text-[15px] font-bold">
					<span class="material-symbols-outlined text-brand">edit_note</span>
					Clinical impressions and notes
				</h3>
			</div>
			<textarea class="field mt-3" id="narrative" name="narrative" form="continue" rows="8" bind:value={narrative} placeholder="Enter the clinical narrative"></textarea>
			<div class="mt-2 flex items-center justify-between text-[11px] text-[#64748B]">
				<span>Saved when you proceed to orders</span>
				<span class="nums">{narrative.length} characters</span>
			</div>
		</article>
	</div>

	<form id="continue" method="POST" action="?/continue">
		<button class="btn btn-block" type="submit">
			Proceed to orders and disposition
			<span class="material-symbols-outlined text-xl">arrow_forward</span>
		</button>
	</form>
</section>
