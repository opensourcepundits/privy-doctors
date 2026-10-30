<script lang="ts">
	import type { IncomingReferral } from '#lib/server/clinic';

	let {
		href = '',
		label = 'Start new consultation',
		referrals
	}: {
		href?: string;
		label?: string;
		referrals: IncomingReferral[];
	} = $props();

	let open = $state(false);
	const waiting = $derived(referrals.filter((item) => item.status !== 'completed'));
</script>

<div class="relative h-full min-w-0 w-full">
	<div class="flex h-full w-full min-w-0">
		{#if href}
			<a class="btn btn-split" {href}>
				<span class="material-symbols-outlined text-lg">add</span>
				{label}
			</a>
		{/if}
		<button
			class={href ? 'btn-caret' : 'btn min-w-0 flex-1'}
			type="button"
			aria-haspopup="menu"
			aria-expanded={open}
			aria-label="Start a consultation from an incoming referral"
			onclick={() => (open = !open)}
		>
			{#if !href}<span>Incoming referrals</span>{/if}
			<span class="material-symbols-outlined">{open ? 'expand_less' : 'expand_more'}</span>
			{#if !href && waiting.length}
				<span class="rounded-full bg-white/20 px-1.5 text-xs">{waiting.length}</span>
			{/if}
		</button>
	</div>
	{#if open}
		<div class="absolute right-0 left-0 z-30 mt-2 min-w-full rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-lg" role="menu">
			<p class="px-2 py-1 text-xs font-semibold tracking-wide text-[#64748B] uppercase">Incoming referrals</p>
			{#each waiting as referral}
				<form method="POST" action="/doctor/referrals?/start">
					<input type="hidden" name="id" value={referral.id} />
					<button class="w-full rounded-lg px-2 py-2 text-left hover:bg-brand-soft" type="submit">
						<span class="block text-sm font-semibold">{referral.first_name} {referral.last_name}</span>
						<span class="block text-xs text-[#64748B]">
							{referral.status === 'in_session' ? 'Continue' : 'Start'} · from {referral.from_name} · {referral.pid}
						</span>
					</button>
				</form>
			{:else}
				<p class="px-2 py-2 text-sm text-[#64748B]">No referrals are waiting.</p>
			{/each}
			<a class="btn-sm mt-1" href="/doctor/referrals">All incoming referrals</a>
		</div>
	{/if}
</div>
