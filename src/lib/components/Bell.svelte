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
	let markedIds = $state<number[]>([]);
	let markedAt = $state<string | null>(null);
	const rows = $derived(
		notes.map((note) => (note.seen_at || !markedIds.includes(note.id) ? note : { ...note, seen_at: markedAt }))
	);
	const unseen = $derived(rows.filter((note) => !note.seen_at).length);

	function close() {
		open = false;
	}

	function toggle() {
		if (open) {
			close();
			return;
		}
		open = true;
		const fresh = notes.filter((note) => !note.seen_at && !markedIds.includes(note.id));
		if (!fresh.length || !markSeen) return;
		markedAt = new Date().toISOString();
		markedIds = [...markedIds, ...fresh.map((note) => note.id)];
		formEl?.requestSubmit();
	}

	function onPointerDown(event: PointerEvent) {
		if (!root?.contains(event.target as Node)) close();
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
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

<div class="relative {open ? 'z-50' : ''}" bind:this={root}>
	<button
		class="relative z-50 grid h-10 w-10 place-items-center rounded-full border-2 shadow-sm {open
			? 'border-[#F8FAFC] bg-[#0F172A] text-white shadow-[0_8px_24px_rgba(15,23,42,0.45)]'
			: 'border-brand bg-brand text-white'}"
		type="button"
		aria-label={unseen ? `Notifications, ${unseen} unseen` : 'Notifications'}
		aria-expanded={open}
		onclick={toggle}
	>
		<span class="material-symbols-outlined {open ? 'fill text-[#FBBF24]' : ''}">{open ? 'notifications_active' : 'notifications'}</span>
		{#if unseen}
			<span class="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full border-2 border-white bg-[#B45309] px-1 text-[10px] leading-4 font-bold text-white">{unseen > 9 ? '9+' : unseen}</span>
		{/if}
	</button>
	{#if markSeen}
		<form
			class="hidden"
			method="POST"
			action={markSeen}
			bind:this={formEl}
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') return;
					markedIds = [];
					markedAt = null;
				};
			}}
		></form>
	{/if}
	{#if open}
		<div class="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-2 border-[#0F172A] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
			<div class="bg-[#0F172A] px-4 py-3 text-white">
				<p class="font-semibold">Notifications</p>
				<p class="text-xs text-white/80">{unseen ? `${unseen} unseen` : 'All seen'}</p>
			</div>
			<div class="max-h-96 overflow-y-auto bg-white">
				{#each rows as note}
					<article class="border-b border-[#E2E8F0] px-4 py-3 last:border-b-0 {note.seen_at ? 'bg-white' : 'border-l-4 border-l-[#B45309] bg-[#FFF7ED]'}">
						<div class="flex items-start justify-between gap-3">
							<p class="font-semibold text-[#0F172A]">{note.title}</p>
							<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase {note.seen_at ? 'bg-[#E2E8F0] text-[#334155]' : 'bg-[#B45309] text-white'}">
								{note.seen_at ? 'Seen' : 'Unseen'}
							</span>
						</div>
						<p class="mt-1 text-sm text-[#0F172A]"><Mention text={note.body} /></p>
						<p class="mt-2 text-xs text-[#334155]">Received {when(note.created_at)}</p>
						<p class="text-xs text-[#334155]">{note.seen_at ? `Seen ${when(note.seen_at)}` : 'Not seen yet'}</p>
					</article>
				{:else}
					<p class="px-4 py-6 text-sm text-[#334155]">No notifications yet.</p>
				{/each}
			</div>
		</div>
	{/if}
</div>
