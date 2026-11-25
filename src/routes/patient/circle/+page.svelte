<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const switches = [
		['view_chart', 'View chart'],
		['accept_access', 'Accept doctor requests'],
		['add_records', 'Add treatments and scans']
	] as const;
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient/profile">Profile</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">My circle</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		Add another patient as a trustee. Each switch controls what they can do with your chart. You can remove a treatment or scan they added.
	</p>
</header>

<section class="space-y-4 px-4 py-4 lg:px-0">
	{#if form?.message}
		<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{form.message}</p>
	{/if}
	{#if data.preview}
		<article class="card text-sm">Trustees are managed when the patient is signed in.</article>
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
			<p class="text-sm text-[#64748B]">No trustees yet.</p>
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

		<article class="card">
			<p class="kicker">Charts shared with you</p>
			{#if data.sharedWithMe.length}
				<ul class="mt-3 space-y-2">
					{#each data.sharedWithMe as person (person.pid)}
						<li class="flex items-center justify-between gap-3">
							<div>
								<p class="font-semibold">{person.name}</p>
								<p class="text-sm text-[#64748B]">{person.pid}</p>
							</div>
							<a class="btn-sm" href="/patient/circle/{person.pid}">Open</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-sm text-[#64748B]">Nobody has added you as a trustee.</p>
			{/if}
		</article>
	{/if}
</section>
