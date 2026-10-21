<script lang="ts">
	import ConsultTimer from '#lib/components/ConsultTimer.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let open = $state<'medication' | 'referral' | 'test' | null>(null);
	let editingPharmacy = $state(false);

	const meds = $derived(data.consult.orders.filter((order) => order.kind === 'medication'));
	const referrals = $derived(data.consult.orders.filter((order) => order.kind === 'referral'));
	const tests = $derived(data.consult.orders.filter((order) => order.kind === 'test'));
	const ready = $derived(Number(meds.length > 0) + Number(referrals.length > 0) + Number(tests.length > 0));
	const pharmacy = $derived(String(data.consult.pharmacy ?? ''));
	const pharmacyParts = $derived(pharmacy.split('•').map((part) => part.trim()));
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
				<span class="rounded-md bg-[#DCE9FF] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">{data.patient.pid}</span>
			</div>
			<span class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active encounter</span>
		</div>
		<p class="mt-1 text-xs text-[#64748B]">{data.consult.code} · Orders and disposition plan</p>
	</article>

	{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}

	<section class="space-y-2">
		<div class="flex items-center justify-between gap-2">
			<h2 class="display flex items-center gap-2 text-sm font-bold">
				<span class="grid h-7 w-7 place-items-center rounded-lg border border-teal-100 bg-teal-50 text-[#0D7377]">
					<span class="material-symbols-outlined text-[18px]">prescriptions</span>
				</span>
				e-Prescription orders
			</h2>
			<button class="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0D7377] px-2.5 text-xs font-semibold text-white" type="button" onclick={() => (open = open === 'medication' ? null : 'medication')}>
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
				<form class="space-y-2 rounded-xl border border-dashed border-[#CBD5E1] p-3" method="POST" action="?/medication">
					<input class="field" name="title" placeholder="Medication" required />
					<input class="field" name="detail" placeholder="Dose and supply" />
					<input class="field" name="note" placeholder="Indication" />
					<button class="btn" type="submit">Save medication</button>
				</form>
			{/if}
			<div class="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-[#EFF4FF] p-2.5">
				<div class="flex min-w-0 items-center gap-2">
					<span class="material-symbols-outlined text-[18px] text-[#0D7377]">local_pharmacy</span>
					<div class="min-w-0">
						<p class="truncate text-xs font-semibold">{pharmacyParts[0] || 'No pharmacy selected'}</p>
						{#if pharmacyParts[1]}<p class="truncate text-[11px] text-[#64748B]">{pharmacyParts.slice(1).join(' · ')}</p>{/if}
					</div>
				</div>
				<button class="shrink-0 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-bold text-[#0D7377]" type="button" onclick={() => (editingPharmacy = !editingPharmacy)}>
					{editingPharmacy ? 'Close' : 'Change'}
				</button>
			</div>
			{#if editingPharmacy}
				<form class="flex flex-col gap-2 sm:flex-row" method="POST" action="?/pharmacy">
					<input class="field" name="pharmacy" value={pharmacy} placeholder="Pharmacy name and address" required />
					<button class="btn" type="submit">Save pharmacy</button>
				</form>
			{/if}
		</div>
	</section>

	<div class="grid items-start gap-4 lg:grid-cols-2">
		<section class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="display flex items-center gap-2 text-sm font-bold">
					<span class="grid h-7 w-7 place-items-center rounded-lg border border-teal-100 bg-teal-50 text-[#006B5F]">
						<span class="material-symbols-outlined text-[18px]">diversity_1</span>
					</span>
					Referrals
				</h2>
				<button class="inline-flex h-8 items-center gap-1 rounded-lg bg-[#DCE9FF] px-2.5 text-xs font-semibold" type="button" onclick={() => (open = open === 'referral' ? null : 'referral')}>
					<span class="material-symbols-outlined text-base">add</span>
					Add
				</button>
			</div>
			{#each referrals as order}
				<article class="card">
					<div class="flex items-start justify-between gap-2">
						<div>
							<h3 class="text-sm font-bold">{order.title}</h3>
							{#if order.detail}<p class="text-[11px] text-[#64748B]">{order.detail}</p>{/if}
						</div>
						<form method="POST" action="?/remove">
							<input type="hidden" name="id" value={order.id} />
							<button class="text-xs text-[#64748B]" type="submit">Remove</button>
						</form>
					</div>
					{#if order.note}
						<p class="mt-2 rounded-xl border border-[#E2E8F0] bg-[#EFF4FF] p-2.5 text-[11px] text-[#0F172A] italic">“{order.note}”</p>
					{/if}
				</article>
			{:else}
				<p class="text-sm text-[#64748B]">No referrals yet.</p>
			{/each}
			{#if open === 'referral'}
				<form class="card space-y-2" method="POST" action="?/referral">
					<input class="field" name="title" placeholder="Specialist" required />
					<input class="field" name="detail" placeholder="Service and clinic" />
					<input class="field" name="note" placeholder="Referral note" />
					<button class="btn" type="submit">Save referral</button>
				</form>
			{/if}
		</section>

		<section class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="display flex items-center gap-2 text-sm font-bold">
					<span class="grid h-7 w-7 place-items-center rounded-lg border border-teal-100 bg-teal-50 text-[#0D7377]">
						<span class="material-symbols-outlined text-[18px]">query_stats</span>
					</span>
					Diagnostic tests
				</h2>
				<button class="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0D7377] px-2.5 text-xs font-semibold text-white" type="button" onclick={() => (open = open === 'test' ? null : 'test')}>
					<span class="material-symbols-outlined text-base">add</span>
					Order diagnostic
				</button>
			</div>
			<div class="card space-y-2">
				{#each tests as order}
					<div class="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
						<div class="min-w-0">
							<p class="text-sm font-bold">{order.title}</p>
							{#if order.detail}<p class="text-[11px] text-[#0D7377]">{order.detail}</p>{/if}
							{#if order.note}<p class="text-[11px] text-[#64748B]">{order.note}</p>{/if}
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
		<form method="POST" action="?/finalize">
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
