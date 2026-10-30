<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import type { TimelineEvent } from '#lib/history';

	let { events, emptyHref = '' }: { events: TimelineEvent[]; emptyHref?: string } = $props();
</script>

{#if events.length}
	<ol class="max-w-3xl">
		{#each events as event, index}
			<li class="relative grid grid-cols-[3.25rem_0.7rem_minmax(0,1fr)] gap-x-1.5 sm:grid-cols-[6.5rem_1.25rem_minmax(0,1fr)] sm:gap-x-4">
				{#if event.href && !event.image}
					<a class="absolute inset-0 z-0" href={event.href} aria-label={event.link || event.title}></a>
				{/if}
				<div class="pointer-events-none pt-0.5 text-left sm:text-right">
					<p class="text-xs leading-4 font-semibold whitespace-nowrap sm:text-sm sm:leading-5">{event.day}</p>
					{#if event.year}<p class="text-[10px] text-[#64748B] sm:text-xs">{event.year}</p>{/if}
				</div>
				<div class="pointer-events-none relative flex justify-center">
					<span class="absolute w-px bg-brand/25 {index === events.length - 1 ? 'top-0 h-3' : 'inset-y-0'}"></span>
					<span class="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full {event.tone} ring-4 ring-canvas sm:mt-1.5 sm:h-3 sm:w-3"></span>
				</div>
				<div class="pointer-events-none relative z-10 pb-6 sm:pb-8">
					<p class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">{event.kind}</p>
					<h2 class="font-semibold">{event.title}</h2>
					{#if event.meta}<p class="text-sm text-[#64748B]"><Mention text={event.meta} /></p>{/if}
					{#if event.body}<p class="mt-1 text-sm"><Mention text={event.body} /></p>{/if}
					{#if event.note}<p class="mt-1 text-sm text-[#64748B]"><Mention text={event.note} /></p>{/if}
					{#if event.files?.length}
						<ul class="pointer-events-auto relative z-10 mt-2 space-y-2">
							{#each event.files as file}
								<li>
									{#if file.image}
										<a href={file.href}><img class="h-28 max-w-xs rounded-xl border border-[#E2E8F0] object-contain" src={file.href} alt={file.name} /></a>
									{/if}
									<a class="btn-sm" href="{file.href}?download">{file.name}</a>
								</li>
							{/each}
						</ul>
					{/if}
					{#if event.log?.length}
						<ul class="mt-2 space-y-1 border-l border-[#E2E8F0] pl-2 text-xs text-[#64748B]">
							{#each event.log as line}
								<li>{line}</li>
							{/each}
						</ul>
					{/if}
					{#if event.image}
						<a class="pointer-events-auto relative z-10" href={event.href}><img class="mt-2 h-28 w-full max-w-xs rounded-xl bg-[#020617] object-contain" src={event.image} alt="" /></a>
					{/if}
					{#if event.href && event.image}
						<a class="btn-sm pointer-events-auto relative z-10 mt-2" href={event.href}>{event.link}</a>
					{:else if event.href && event.link}
						<span class="btn-sm mt-2">{event.link}</span>
					{/if}
				</div>
			</li>
		{/each}
	</ol>
{:else}
	<div class="max-w-3xl border-l border-brand/25 py-2 pl-4 sm:pl-6">
		<p class="font-semibold">No records found</p>
		<p class="text-sm text-[#64748B]">There are no records filed under this category.</p>
		{#if emptyHref}
			<a class="btn-sm mt-3" href={emptyHref}>Show all history</a>
		{/if}
	</div>
{/if}
