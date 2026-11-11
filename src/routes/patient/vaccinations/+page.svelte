<script lang="ts">
	import VaxxList from '#lib/components/VaxxList.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/profile">Profile</a>
	<div class="mt-2 flex items-center gap-2">
		<span class="material-symbols-outlined text-brand">vaccines</span>
		<h1 class="display text-2xl font-bold lg:text-3xl">Vaxx card</h1>
	</div>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		Vaccinations given in clinic, ordered by a physician and then recorded, or added by you. A photo of the record is optional.
	</p>
</header>

{#await data.card}
	<div class="px-4 py-4 lg:px-0"><Skeleton count={3} /></div>
{:then card}
	<section class="space-y-3 px-4 py-4 lg:px-0">
		<p class="text-sm font-semibold">{card.vaccinations.length} recorded</p>
		<VaxxList shots={card.vaccinations} />
	</section>

	<section class="mx-4 max-w-xl pb-8 lg:mx-0">
		{#if card.preview}
			<article class="card text-sm">A vaccination is added when the patient is signed in.</article>
		{:else}
			<form class="card space-y-3" method="POST" action="?/report" enctype="multipart/form-data">
				<h2 class="display text-lg font-semibold">Add a vaccination</h2>
				<p class="text-sm text-[#64748B]">Use this when you received a vaccination outside a consultation here.</p>
				{#if form?.message}
					<p class="text-sm text-red-600">{form.message}</p>
				{/if}
				<label class="block text-sm font-semibold" for="vax-name">
					Vaccination
					<input class="field mt-1" id="vax-name" name="name" required maxlength="120" autocomplete="off" value={form?.name ?? ''} placeholder="Influenza, COVID-19, Tdap" />
				</label>
				<label class="block text-sm font-semibold" for="vax-date">
					Date given
					<input class="field mt-1" id="vax-date" name="given_on" type="date" required max={data.today} value={form?.givenOn ?? data.today} />
				</label>
				<label class="block text-sm font-semibold" for="vax-site">
					Site
					<span class="font-normal text-[#64748B]">optional</span>
					<input class="field mt-1" id="vax-site" name="site" maxlength="80" autocomplete="off" value={form?.site ?? ''} placeholder="Left deltoid" />
				</label>
				<label class="block text-sm font-semibold" for="vax-lot">
					Lot
					<span class="font-normal text-[#64748B]">optional</span>
					<input class="field mt-1" id="vax-lot" name="lot" maxlength="40" autocomplete="off" value={form?.lot ?? ''} />
				</label>
				<label class="block text-sm font-semibold" for="vax-note">
					Note
					<span class="font-normal text-[#64748B]">optional</span>
					<input class="field mt-1" id="vax-note" name="note" maxlength="500" autocomplete="off" value={form?.note ?? ''} placeholder="Pharmacy, clinic, or anything else to remember" />
				</label>
				<label class="block text-sm font-semibold" for="vax-proof">
					Photo of the record
					<span class="font-normal text-[#64748B]">optional</span>
					<input class="mt-1 block w-full text-sm" id="vax-proof" name="proof" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
					<span class="mt-1 block text-xs font-normal text-[#64748B]">JPEG, PNG, GIF, or WebP. 8 MB or smaller.</span>
				</label>
				<button class="btn" type="submit">
					<span class="material-symbols-outlined text-lg">vaccines</span>
					Add to my card
				</button>
			</form>
		{/if}
	</section>
{:catch}
	<p class="px-4 py-4 text-sm text-[#64748B] lg:px-0">The vaccination card could not be loaded.</p>
{/await}
