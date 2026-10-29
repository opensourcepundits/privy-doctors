<script lang="ts">
	import { ageOn } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const patient = $derived(data.patient);
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Record locked</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">{patient.first_name} {patient.last_name}</h1>
	<p class="text-sm text-[#64748B]">{patient.pid} · {ageOn(patient.dob)} years · {patient.sex}</p>
</header>

<section class="mx-4 max-w-xl py-4 lg:mx-0">
	<article class="card">
		{#if data.status === 'pending'}
			<p>Waiting for {patient.first_name} to allow access. They have a notification in the patient portal.</p>
		{:else if data.status === 'revoked'}
			<p>{patient.first_name} turned off your access to this record. Scan their QR code or enter their access code to open it again. They can also turn the switch back on from My physicians.</p>
		{:else if patient.has_portal}
			<p>Searching does not open this chart. Ask {patient.first_name} to allow access, or use the QR code or access code on their profile.</p>
			<form class="mt-4" method="POST" action="?/request">
				<button class="btn" type="submit">Ask {patient.first_name} to allow access</button>
			</form>
		{:else}
			<p>{patient.first_name} has no portal account, so a request cannot be approved there. Scan the QR code or enter the access code from the clinic.</p>
		{/if}
		<a class="btn mt-3" href="/doctor/scan">
			<span class="material-symbols-outlined text-lg">qr_code_scanner</span>
			Scan QR or enter a code
		</a>
	</article>
</section>
