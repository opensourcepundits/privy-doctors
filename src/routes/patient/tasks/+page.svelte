<script lang="ts">
	import TaskChecklist from '#lib/components/TaskChecklist.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const done = $derived(data.tasks.filter((task) => task.stored_name).length);
</script>

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">From your consultations</p>
	<h1 class="display text-2xl font-bold">Tasks</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">
		When a clinician orders a test, it is added here and stays tied to that consultation. Upload the result as a PDF to complete the item.
	</p>
	<p class="mt-2 text-sm font-semibold">{done} of {data.tasks.length} complete</p>
</header>

<section class="px-4 py-4 lg:px-0">
	<TaskChecklist tasks={data.tasks} upload message={form && 'message' in form ? form.message : ''} />
</section>
