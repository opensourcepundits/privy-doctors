<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Cardiology practice stream</p>
	<h1 class="display text-2xl font-bold">Practice analytics</h1>
	<p class="text-sm text-[#64748B]">Encounter capacity, diagnostic yield, and inflow metrics</p>
</header>

<section class="grid grid-cols-2 gap-3 px-4 pt-4 lg:grid-cols-4 lg:px-0">
	{#each data.metrics as metric}
		<article class="card">
			<p class="text-xs font-semibold text-[#0D7377]">{metric.delta}</p>
			<p class="display nums mt-1 text-3xl font-bold">{metric.value}</p>
			<p class="text-sm font-semibold">{metric.label}</p>
			<p class="text-xs text-[#64748B]">{metric.caption}</p>
		</article>
	{/each}
</section>

<section class="px-4 pt-6 lg:px-0">
	<div class="mb-3 flex items-end justify-between">
		<h2 class="display text-lg font-semibold">Diagnostic modality volume</h2>
		<p class="nums text-sm text-[#64748B]">{data.modalityTotal} total</p>
	</div>
	<div class="card space-y-3">
		{#each data.modalities as item}
			<div>
				<div class="mb-1 flex justify-between text-sm">
					<span>{item.name}</span>
					<span class="nums text-[#64748B]">{item.units} · {item.share}%</span>
				</div>
				<div class="h-2 rounded-full bg-[#E5EEFF]">
					<div class="h-2 rounded-full bg-[#0D7377]" style="width: {item.share}%"></div>
				</div>
			</div>
		{/each}
	</div>
</section>

<div class="grid items-start gap-6 lg:grid-cols-2">
<section class="px-4 pt-6 lg:px-0">
	<h2 class="display text-lg font-semibold">Cohort and risk stratification</h2>
	<p class="text-sm text-[#64748B]">Active cardiology panel · N = {data.panel}</p>
	<div class="mt-3 space-y-3">
		{#each data.cohorts as cohort}
			<article class="card">
				<div class="flex items-center justify-between">
					<p class="font-semibold">{cohort.name}</p>
					<p class="nums text-sm">{cohort.share}% ({cohort.patients} pts)</p>
				</div>
				<div class="mt-2 h-2 rounded-full bg-[#E5EEFF]">
					<div class="h-2 rounded-full bg-[#14B8A6]" style="width: {cohort.share}%"></div>
				</div>
			</article>
		{/each}
	</div>
	<p class="card mt-3 text-sm">{data.note}</p>
</section>

<section class="px-4 py-6 lg:px-0">
	<h2 class="display text-lg font-semibold">Referral colleague inflow</h2>
	<p class="text-sm text-[#64748B]">{data.referralTotal} total intakes</p>
	<div class="mt-3 space-y-3">
		{#each data.referrals as source}
			<article class="card flex items-center justify-between gap-3">
				<div>
					<p class="font-semibold">{source.name}</p>
					<p class="text-sm text-[#64748B]">{source.channel} · {source.share}%</p>
				</div>
				<p class="nums font-semibold">{source.patients} pts</p>
			</article>
		{/each}
	</div>
</section>
</div>
