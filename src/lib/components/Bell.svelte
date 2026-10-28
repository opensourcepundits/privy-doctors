<script lang="ts">
	import { enhance } from '$app/forms';
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate, formatTime } from '#lib/format';

	type Note = {
		id: number;
		title: string;
		body: string;
		created_at: Date | string;
		seen_at: Date | string | null;
	};

	let {
		notes,
		markSeen = ''
	}: {
		notes: Note[];
		markSeen?: string;
	} = $props();

	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let formEl: HTMLFormElement | undefined = $state();
	const unseen = $derived(notes.filter((note) => !note.seen_at).length);

	function close(mark: boolean) {
		if (!open) return;
		open = false;
		if (mark && markSeen && unseen > 0) formEl?.requestSubmit();
	}

	function toggle() {
		if (open) close(true);
		else open = true;
	}

	function onPointerDown(event: PointerEvent) {
		if (!root?.contains(event.target as Node)) close(true);
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') close(true);
	}

	$effect(() => {
		if (!open) return;
		window.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
		};
	});

	function when(value: Date | string) {
		return `${formatDate(value)} · ${formatTime(value)}`;
	}
</script>

<div class="relative" bind:this={root}>
	<button
		class="relative grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] bg-white text-brand shadow-sm"
		type="button"
		aria-label={unseen ? `Notifications, ${unseen} unseen` : 'Notifications'}
		aria-expanded={open}
		onclick={toggle}
	>
		<span class="material-symbols-outlined">notifications</span>
		{#if unseen}
			<span class="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-4 font-bold text-white">{unseen > 9 ? '9+' : unseen}</span>
		{/if}
	</button>
	{#if markSeen}
		<form class="hidden" method="POST" action={markSeen} bind:this={formEl} use:enhance></form>
	{/if}
	{#if open}
		<div class="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl">
			<div class="border-b border-[#E2E8F0] px-4 py-3">
				<p class="font-semibold">Notifications</p>
				<p class="text-xs text-[#64748B]">{unseen ? `${unseen} unseen` : 'All seen'}</p>
			</div>
			<div class="max-h-96 overflow-y-auto">
				{#each notes as note}
					<article class="border-b border-[#E2E8F0] px-4 py-3 last:border-b-0">
						<div class="flex items-start justify-between gap-3">
							<p class="font-semibold">{note.title}</p>
							<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase {note.seen_at ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-brand-soft text-brand'}">
								{note.seen_at ? 'Seen' : 'Unseen'}
							</span>
						</div>
						<p class="mt-1 text-sm"><Mention text={note.body} /></p>
						<p class="mt-2 text-xs text-[#64748B]">Received {when(note.created_at)}</p>
						<p class="text-xs text-[#64748B]">{note.seen_at ? `Seen ${when(note.seen_at)}` : 'Not seen yet'}</p>
					</article>
				{:else}
					<p class="px-4 py-6 text-sm text-[#64748B]">No notifications yet.</p>
				{/each}
			</div>
		</div>
	{/if}
</div>
