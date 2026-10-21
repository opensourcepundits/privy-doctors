<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Clinician</p>
	<h1 class="display text-2xl font-bold">{data.doctor.name}</h1>
	<p class="text-sm text-[#64748B]">{data.doctor.credentials} · {data.doctor.specialty}</p>
</header>

<section class="grid max-w-xl gap-3 px-4 py-4 lg:px-0">
	<article class="card space-y-2 text-sm">
		<p><span class="text-[#64748B]">Practice</span><br />{data.doctor.practice}</p>
		<p><span class="text-[#64748B]">Location</span><br />{data.doctor.location}</p>
		<p><span class="text-[#64748B]">NPI</span><br /><span class="nums">{data.doctor.npi}</span></p>
		<p><span class="text-[#64748B]">Concierge line</span><br />{data.doctor.phone}</p>
	</article>
	<a class="btn" href="/patient">Open Eleanor Vance’s patient view</a>
	<form method="POST" action="/logout"><button class="btn-line" type="submit">Sign out</button></form>
</section>
