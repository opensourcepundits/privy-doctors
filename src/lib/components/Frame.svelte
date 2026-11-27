<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Bell from '#lib/components/Bell.svelte';

	let {
		path,
		nav,
		notice,
		query = '',
		who = '',
		role = '',
		scheme,
		notifications = [],
		markSeen = '',
		children
	}: {
		path: string;
		notice?: string | null;
		query?: string;
		who?: string;
		role?: string;
		scheme: 'doctor' | 'patient';
		nav: { href: string; label: string; icon: string; fab?: boolean; badge?: number }[];
		notifications?: {
			id: number;
			title: string;
			body: string;
			created_at: Date | string;
			seen_at: Date | string | null;
			link?: string | null;
		}[];
		markSeen?: string;
		children: Snippet;
	} = $props();

	function itemMatches(href: string) {
		const [target, search] = href.split('?');
		const onPath =
			target === '/doctor' || target === '/patient'
				? path === target
				: path === target || path.startsWith(`${target}/`);
		if (!onPath) return false;
		if (!search) return true;
		const wanted = new URLSearchParams(search);
		const actual = new URLSearchParams(query);
		for (const [key, value] of wanted) {
			if (actual.get(key) !== value) return false;
		}
		return true;
	}

	let hidden = $state('');
	const shown = $derived(notice && notice !== hidden ? notice : '');

	function clearNotice() {
		const url = new URL(page.url);
		if (!url.searchParams.has('notice')) return;
		url.searchParams.delete('notice');
		goto(`${url.pathname}${url.search}${url.hash}`, { replace: true, shallow: true, state: page.state });
	}

	const monogram = $derived(
		who
			.replace(/^Dr\.?\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase()
	);

	function dismiss() {
		hidden = notice ?? ' ';
		clearNotice();
	}

	$effect(() => {
		const current = notice ?? '';
		if (!current) return;
		const timer = setTimeout(() => {
			hidden = current;
			clearNotice();
		}, 6000);
		return () => clearTimeout(timer);
	});

	function current(href: string) {
		if (!itemMatches(href)) return false;
		if (href.includes('?')) return true;
		const [target] = href.split('?');
		const narrowed = nav.some(
			(item) => item.href.includes('?') && item.href.startsWith(`${target}?`) && itemMatches(item.href)
		);
		return !narrowed;
	}
</script>

<div class="scheme-{scheme}">
	<div class="min-h-dvh bg-shell lg:bg-canvas">
		<div class="mx-auto min-h-dvh w-full max-w-[440px] bg-canvas shadow-xl lg:grid lg:max-w-none lg:grid-cols-[244px_minmax(0,1fr)] lg:shadow-none">
			<aside class="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white lg:flex">
				<a class="flex h-16 items-center border-b border-line px-5 text-lg font-semibold tracking-tight text-ink" href="/{scheme}">
					care<span class="font-mono font-medium text-brand">OS</span>
				</a>
				<p class="kicker px-5 pt-5 pb-2">{scheme === 'doctor' ? 'Clinic' : 'Patient portal'}</p>
				<nav class="flex flex-1 flex-col" aria-label="Main">
					{#each nav as item}
						<a
							href={item.href}
							aria-current={current(item.href) ? 'page' : undefined}
							class="relative flex h-11 items-center gap-3 px-5 text-sm font-medium {current(item.href)
								? 'bg-brand-wash text-ink before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand'
								: 'text-muted hover:bg-canvas hover:text-ink'}"
						>
							<span class="material-symbols-outlined text-[20px] {current(item.href) ? 'text-brand' : ''}">{item.icon}</span>
							{item.label}
							{#if item.badge}
								<span class="nums ml-auto rounded-sm bg-brand px-1.5 text-[10px] leading-4 font-semibold text-white">{item.badge}</span>
							{/if}
						</a>
					{/each}
				</nav>
				{#if who}
					<div class="flex items-center gap-3 border-t border-line px-5 py-4">
						<span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink font-mono text-xs font-medium text-white">{monogram}</span>
						<span class="min-w-0">
							<span class="block truncate text-sm font-semibold text-ink">{who}</span>
							<span class="block truncate text-xs text-muted">{role}</span>
						</span>
					</div>
				{/if}
			</aside>
			<div class="relative pb-24 lg:min-h-dvh lg:pb-12">
				<header class="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-white/95 px-4 backdrop-blur lg:h-16 lg:justify-end lg:px-8">
					<a class="text-lg font-semibold tracking-tight text-ink lg:hidden" href="/{scheme}">care<span class="font-mono font-medium text-brand">OS</span></a>
					<div class="flex min-w-0 items-center justify-end gap-2">
						{#if shown}
							<p class="flex min-w-0 max-w-[min(100%,18rem)] items-center gap-2 rounded-md bg-ink py-1 pl-3 pr-1 text-sm text-white" role="status">
								<span class="truncate">{shown}</span>
								<button class="grid h-6 w-6 shrink-0 place-items-center rounded text-white/80 hover:bg-white/15" type="button" aria-label="Dismiss notice" onclick={dismiss}>
									<span class="material-symbols-outlined text-[16px]">close</span>
								</button>
							</p>
						{/if}
						<Bell notes={notifications} {markSeen} />
					</div>
				</header>
				<div class="lg:mx-auto lg:max-w-6xl lg:px-8 lg:pt-2">
					{@render children()}
				</div>
			</div>
		</div>
	</div>

	<nav class="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[440px] grid-cols-5 border-t border-line bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Main">
		{#each nav as item}
			<a
				href={item.href}
				aria-current={current(item.href) ? 'page' : undefined}
				class="relative flex min-w-0 flex-col items-center gap-0.5 pt-2.5 text-center text-[11px] font-medium {current(item.href)
					? 'text-brand before:absolute before:inset-x-4 before:top-0 before:h-[2px] before:bg-brand'
					: 'text-muted'}"
			>
				{#if item.fab}
					<span class="grid h-8 w-10 place-items-center rounded-md bg-brand text-white">
						<span class="material-symbols-outlined">{item.icon}</span>
					</span>
				{:else}
					<span class="relative grid h-8 place-items-center">
						<span class="material-symbols-outlined">{item.icon}</span>
						{#if item.badge}
							<span class="nums absolute -top-0.5 -right-3 grid min-w-4 place-items-center rounded-sm bg-brand px-1 text-[9px] leading-4 font-semibold text-white">{item.badge}</span>
						{/if}
					</span>
				{/if}
				<span class="max-w-full truncate px-0.5">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
