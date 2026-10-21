<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const current = $derived(data.prescriptions.filter((order) => order.status === 'active').flatMap((order) => order.items.map((item) => ({ ...item, prescriber: order.prescriber, code: order.code }))));
	const past = $derived(data.prescriptions.filter((order) => order.status !== 'active').flatMap((order) => order.items.map((item) => ({ ...item, prescriber: order.prescriber, status: order.status }))));
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-[#0D7377]" href="/patient">Home</a>
	<p class="kicker mt-3">Cardiology care plan</p>
	<h1 class="display text-2xl font-bold">{data.patient.first_name} {data.patient.last_name}</h1>
	<p class="text-sm">Medications on your current care plan.</p>
</header>

<section class="space-y-3 px-4 py-4">
	{#each current as med}
		<article class="card">
			<p class="text-xs text-[#64748B]">{med.prescriber} · {med.code}</p>
			<h2 class="font-semibold">{med.name}</h2>
			<p class="text-sm">{med.strength} {med.form}</p>
			<p class="mt-2 text-sm">{med.indication}</p>
			<p class="text-sm text-[#64748B]">{med.schedule_detail}</p>
			<p class="text-xs text-[#64748B]">{med.remaining_label} · {med.refills}</p>
		</article>
	{/each}
	<form class="card space-y-2" method="POST" action="?/otc">
		<p class="font-semibold">Add an over-the-counter supplement</p>
		<input class="field" name="name" placeholder="Name" required />
		<input class="field" name="detail" placeholder="Dosage and frequency" />
		{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
		<button class="btn" type="submit">Save to my records</button>
	</form>
	<h2 class="display text-lg font-semibold">Past and discontinued</h2>
	{#each past as med}
		<article class="card">
			<p class="font-semibold">{med.name} {med.strength}</p>
			<p class="text-sm capitalize">{med.status} · {med.prescriber}</p>
			<p class="text-sm text-[#64748B]">{med.indication}</p>
		</article>
	{/each}
</section>
