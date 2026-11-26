<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let view = $state<'shared' | 'granted'>('shared');
	let moved = $state(false);
	const switches = [
		['view_chart', 'View chart'],
		['accept_access', 'Accept doctor requests'],
		['add_records', 'Add treatments and scans']
	] as const;

	function show(next: 'shared' | 'granted') {
		if (next === view) return;
		moved = true;
		view = next;
	}

	function powersOn(person: { view_chart: boolean; accept_access: boolean; add_records: boolean }) {
		return switches.filter(([power]) => person[power]).map(([, label]) => label);
	}
</script>

<div class="sticky top-14 z-20 bg-canvas/95 px-4 pt-3 pb-2 backdrop-blur lg:hidden">
	<div class="relative grid grid-cols-2 rounded-full bg-[#E2E8F0] p-1" role="tablist" aria-label="Circle lists">
		<span
			class="circle-pill absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none {view === 'granted' ? 'translate-x-full' : ''}"
			aria-hidden="true"
		></span>
		<button
			class="relative z-10 rounded-full px-2 py-2 text-sm font-semibold {view === 'shared' ? 'text-brand' : 'text-[#64748B]'}"
			type="button"
			role="tab"
			aria-selected={view === 'shared'}
			onclick={() => show('shared')}
		>
			I have access
		</button>
		<button
			class="relative z-10 rounded-full px-2 py-2 text-sm font-semibold {view === 'granted' ? 'text-brand' : 'text-[#64748B]'}"
			type="button"
			role="tab"
			aria-selected={view === 'granted'}
			onclick={() => show('granted')}
		>
			I granted access
		</button>
	</div>
</div>

<header class="px-4 pt-4 lg:px-0 lg:pt-6">
	<a class="text-sm font-semibold text-brand" href="/patient/profile">Profile</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">My circle</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		Open charts other patients have shared with you, and choose who can open yours.
	</p>
</header>

<div class="grid items-start gap-6 px-4 py-4 lg:grid-cols-2 lg:px-0">
	{#if form?.message}
		<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2">{form.message}</p>
	{/if}

	<section class="space-y-3 {view === 'shared' ? (moved ? 'circle-swap' : '') : 'max-lg:hidden'}">
		<div>
			<h2 class="display text-lg font-semibold">Charts you can open</h2>
			<p class="mt-1 text-sm text-[#64748B]">Patients who added you to their circle.</p>
		</div>
		{#if data.preview}
			<p class="text-sm text-[#64748B]">Charts shared with you appear when the patient is signed in.</p>
		{:else if data.sharedWithMe.length}
			{#each data.sharedWithMe as person (person.pid)}
				{@const on = powersOn(person)}
				<article class="card flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="font-semibold">{person.name}</p>
						<p class="text-sm text-[#64748B]">{person.pid}</p>
						<p class="mt-2 text-sm {on.length ? 'text-emerald-700' : 'text-[#64748B]'}">
							{on.length ? on.join(' · ') : 'No permissions are turned on'}
						</p>
					</div>
					<a class="btn-sm shrink-0" href="/patient/circle/{person.pid}">Open</a>
				</article>
			{/each}
		{:else}
			<p class="text-sm text-[#64748B]">No charts are shared with you yet.</p>
		{/if}
	</section>

	<section class="space-y-3 {view === 'granted' ? (moved ? 'circle-swap' : '') : 'max-lg:hidden'}">
		<div>
			<h2 class="display text-lg font-semibold">Who can open your chart</h2>
			<p class="mt-1 text-sm text-[#64748B]">Each switch controls what that person can do. You can remove a treatment or scan they added.</p>
		</div>
		{#if data.preview}
			<p class="text-sm text-[#64748B]">Trustees are managed when the patient is signed in.</p>
		{:else}
			<form class="card space-y-2" method="POST" action="?/add" use:enhance>
				<label class="block text-sm font-semibold" for="circle-query">
					Add a patient
					<input class="field mt-1" id="circle-query" name="query" required autocomplete="off" placeholder="PID or email" />
				</label>
				<button class="btn" type="submit">Add to my circle</button>
			</form>

			{#if data.trustees.length}
				{#each data.trustees as person (person.id)}
					<article class="card space-y-3">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-semibold">{person.name}</p>
								<p class="text-sm text-[#64748B]">{person.pid}</p>
							</div>
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="id" value={person.id} />
								<button class="btn-sm-line" type="submit">Remove</button>
							</form>
						</div>
						<ul class="space-y-2">
							{#each switches as [power, label] (power)}
								{@const on = person[power]}
								<li class="flex items-center justify-between gap-3">
									<span class="text-sm font-semibold">{label}</span>
									<form method="POST" action="?/power" use:enhance>
										<input type="hidden" name="id" value={person.id} />
										<input type="hidden" name="power" value={power} />
										<input type="hidden" name="allow" value={on ? 'no' : 'yes'} />
										<button
											class="relative h-8 w-14 shrink-0 rounded-full {on ? 'bg-brand' : 'bg-[#CBD5E1]'}"
											type="submit"
											role="switch"
											aria-checked={on}
											aria-label="{on ? 'Turn off' : 'Turn on'} {label} for {person.name}"
										>
											<span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow {on ? 'left-7' : 'left-1'}"></span>
										</button>
									</form>
								</li>
							{/each}
						</ul>
					</article>
				{/each}
			{:else}
				<p class="text-sm text-[#64748B]">Nobody can open your chart yet.</p>
			{/if}

			{#if data.added.reports.length || data.added.scans.length}
				<article class="card space-y-3">
					<p class="kicker">Added by your circle</p>
					{#each data.added.reports as item (item.id)}
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-semibold">{item.title}</p>
								<p class="text-sm text-[#64748B]">Treatment · {formatDate(item.when)} · Added by {item.addedBy}</p>
							</div>
							<form method="POST" action="?/removeReport" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button class="btn-sm-line" type="submit">Remove</button>
							</form>
						</div>
					{/each}
					{#each data.added.scans as item (item.id)}
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-semibold">{item.title}</p>
								<p class="text-sm text-[#64748B]">Scan · {formatDate(item.when)} · Added by {item.addedBy}</p>
							</div>
							<form method="POST" action="?/removeScan" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button class="btn-sm-line" type="submit">Remove</button>
							</form>
						</div>
					{/each}
				</article>
			{/if}
		{/if}
	</section>
</div>

<style>
	@media (max-width: 1023px) {
		.circle-swap {
			animation: circle-swap 220ms ease;
		}
	}

	@keyframes circle-swap {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.circle-swap {
			animation: none;
		}
	}
</style>
