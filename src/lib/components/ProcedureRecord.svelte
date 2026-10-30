<script lang="ts">
	import { liveProcedureYear } from '#lib/format';

	let {
		item,
		backHref,
		backLabel
	}: {
		item: { year: string; name: string };
		backHref: string;
		backLabel: string;
	} = $props();
	const year = $derived(liveProcedureYear(item.year).label);
</script>

<header class="px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href={backHref}>
		<span class="material-symbols-outlined text-base">arrow_back</span> {backLabel}
	</a>
	<p class="kicker mt-3">Procedure · {year}</p>
	<h1 class="display text-2xl font-bold">{item.name}</h1>
</header>

<section class="px-4 py-4 lg:px-0">
	<article class="card space-y-2 text-sm">
		<p><span class="text-[#64748B]">Year</span><br />{year}</p>
		<p><span class="text-[#64748B]">Procedure</span><br />{item.name}</p>
		<p class="text-[#64748B]">This is the procedure filed on the profile. No separate operative note is attached.</p>
	</article>
</section>
