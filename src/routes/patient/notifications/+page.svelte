<script lang="ts">
	import { formatDate, formatTime } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="px-4 pt-5">
	<a class="text-sm font-semibold text-brand" href="/patient">Home</a>
	<h1 class="display mt-2 text-2xl font-bold">Notifications</h1>
</header>
<section class="cards-2 px-4 py-4 lg:px-0">
	{#each data.notifications as note}
		<article class="card">
			<p class="font-semibold">{note.title}</p>
			<p class="text-sm">{note.body}</p>
			<p class="text-xs text-[#64748B]">{formatDate(note.created_at)} · {formatTime(note.created_at)}</p>
		</article>
	{:else}
		<p class="text-sm text-[#64748B]">You are caught up.</p>
	{/each}
</section>
