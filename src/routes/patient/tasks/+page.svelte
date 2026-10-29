<script lang="ts">
	import BookingActions from '#lib/components/BookingActions.svelte';
	import Mention from '#lib/components/Mention.svelte';
	import TaskChecklist from '#lib/components/TaskChecklist.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { dayRelation, formatLongDate, formatTime } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">From your consultations</p>
	<h1 class="display text-2xl font-bold">To do</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		Upcoming consultations are listed here, along with tests from a consultation. You can move an approved visit to another open time, and the physician is notified.
	</p>
</header>

<section id="visits" class="px-4 pt-4 lg:px-0">
	<h2 class="display text-lg font-semibold">Upcoming consultations</h2>
	{#await data.visits}
		<div class="pt-3"><Skeleton count={2} /></div>
	{:then visits}
		{#if form?.message}<p class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{form.message}</p>{/if}
		<div class="mt-3 grid gap-3 lg:grid-cols-2">
			{#each visits as visit}
				<article class="card">
					<p class="kicker">{dayRelation(visit.starts_at)} · {visit.title}</p>
					<p class="mt-1 font-semibold">{formatLongDate(visit.starts_at)} · {formatTime(visit.starts_at)}</p>
					<p class="text-sm">{visit.duration_min} min · <Mention text={visit.doctor_name} />{#if visit.credentials}, {visit.credentials}{/if}</p>
					{#if visit.location}<p class="text-sm text-[#64748B]">{visit.location}</p>{/if}
					{#if visit.reason}<p class="mt-1 text-sm">{visit.reason}</p>{/if}
					<BookingActions id={visit.id} status={visit.status} note={visit.response_note} slots={visit.slots} mode="patient" />
				</article>
			{:else}
				<p class="text-sm text-[#64748B]">No upcoming consultations.</p>
			{/each}
		</div>
	{:catch}
		<p class="pt-3 text-sm text-[#64748B]">Visits could not be loaded.</p>
	{/await}
</section>

{#await data.tasks}
	<div class="px-4 py-4 lg:px-0"><Skeleton count={3} /></div>
{:then tasks}
	{@const done = tasks.filter((task) => task.stored_name).length}
	<p class="px-4 text-sm font-semibold lg:px-0">{done} of {tasks.length} complete</p>
	<section class="px-4 py-4 lg:px-0">
		<TaskChecklist {tasks} upload message={form && 'message' in form ? form.message : ''} />
	</section>
{:catch}
	<p class="px-4 py-4 text-sm text-[#64748B] lg:px-0">The checklist could not be loaded.</p>
{/await}
