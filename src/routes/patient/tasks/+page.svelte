<script lang="ts">
	import TaskChecklist from '#lib/components/TaskChecklist.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">From your consultations</p>
	<h1 class="display text-2xl font-bold">Tasks</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		When a clinician orders a test, it is added here and stays tied to that consultation. Upload the result as a PDF to complete the item.
	</p>
</header>

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
