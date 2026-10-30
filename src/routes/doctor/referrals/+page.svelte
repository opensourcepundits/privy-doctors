<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import { ageOn, formatDate } from '#lib/format';
	import type { IncomingReferral } from '#lib/server/clinic';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const groups = $derived([
		['incoming', 'Incoming', data.incoming.filter((item) => item.status === 'incoming')],
		['in_session', 'Consultation started', data.incoming.filter((item) => item.status === 'in_session')],
		['completed', 'Completed', data.incoming.filter((item) => item.status === 'completed')]
	] as const);

	function actionLabel(status: IncomingReferral['status']) {
		return status === 'in_session' ? 'Continue consultation' : 'Start consultation';
	}
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Clinic</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">Referrals</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">Patients other clinicians have sent to you. Start the visit from here, or from the new-consultation menu.</p>
</header>

{#if form?.message}
	<p class="mx-4 mt-4 text-sm text-red-600 lg:mx-0">{form.message}</p>
{/if}

<section class="space-y-6 px-4 py-4 lg:px-0">
	{#each groups as [status, label, rows]}
		{#if rows.length}
			<div>
				<h2 class="display text-lg font-semibold">{label}</h2>
				<div class="mt-3 grid gap-3 lg:grid-cols-2">
					{#each rows as referral}
						<article class="card">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<h3 class="font-semibold">{referral.first_name} {referral.last_name}</h3>
									<p class="text-sm text-[#64748B]">{referral.pid} · {ageOn(referral.dob)}y · {referral.sex}</p>
								</div>
								<p class="shrink-0 text-xs text-[#64748B]">{formatDate(referral.created_at)}</p>
							</div>
							<p class="mt-2 text-sm">From <Mention text={referral.from_name} /></p>
							{#if referral.note}<p class="mt-1 text-sm text-[#64748B]">{referral.note}</p>{/if}
							<div class="mt-3 flex flex-wrap items-center gap-3">
								{#if status !== 'completed'}
									<form method="POST" action="?/start">
										<input type="hidden" name="id" value={referral.id} />
										<button class="btn" type="submit">
											<span class="material-symbols-outlined text-lg">play_arrow</span>
											{actionLabel(referral.status)}
										</button>
									</form>
								{:else}
									<p class="text-sm font-semibold text-emerald-700">Consultation signed</p>
								{/if}
								<a class="btn-sm" href="/doctor/patients/{referral.pid}">Open chart</a>
							</div>
						</article>
					{/each}
				</div>
			</div>
		{/if}
	{:else}
		<p class="text-sm text-[#64748B]">No referrals have been sent to you.</p>
	{/each}
	{#if data.incoming.length === 0}
		<p class="text-sm text-[#64748B]">No referrals have been sent to you.</p>
	{/if}
</section>
