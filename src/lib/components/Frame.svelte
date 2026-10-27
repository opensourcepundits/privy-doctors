<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		path,
		nav,
		notice,
		query = '',
		who = '',
		role = '',
		scheme,
		children
	}: {
		path: string;
		notice?: string | null;
		query?: string;
		who?: string;
		role?: string;
		scheme: 'doctor' | 'patient';
		nav: { href: string; label: string; icon: string; fab?: boolean }[];
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
	<div class="min-h-dvh bg-shell lg:bg-shell-desk">
		<div class="mx-auto min-h-dvh w-full max-w-[440px] bg-canvas shadow-xl lg:grid lg:max-w-none lg:grid-cols-[260px_minmax(0,1fr)] lg:shadow-none">
			<aside class="sticky top-0 hidden h-dvh flex-col border-r border-[#E2E8F0] bg-white lg:flex">
				<div class="h-1 bg-brand"></div>
				<div class="px-5 pt-5 pb-4">
					<p class="display text-lg font-bold text-brand">CareOS</p>
					<p class="text-xs text-[#64748B]">Cardiology practice</p>
				</div>
				<nav class="flex flex-1 flex-col gap-1 px-3">
					{#each nav as item}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold {current(item.href)
								? 'bg-brand/10 text-brand'
								: 'text-[#64748B] hover:bg-canvas hover:text-[#0F172A]'}"
						>
							<span class="material-symbols-outlined">{item.icon}</span>
							{item.label}
						</a>
					{/each}
				</nav>
				{#if who}
					<div class="border-t border-[#E2E8F0] px-5 py-4">
						<p class="text-sm font-semibold text-[#0F172A]">{who}</p>
						<p class="text-xs text-[#64748B]">{role}</p>
					</div>
				{/if}
			</aside>
			<div class="relative pb-24 lg:min-h-dvh lg:pb-12">
				<div class="h-1 bg-brand lg:hidden"></div>
				<div class="lg:mx-auto lg:max-w-6xl lg:px-8 lg:pt-4">
					{#if notice}
						<p class="mx-4 mt-4 rounded-xl bg-brand px-4 py-3 text-sm text-white lg:mx-0">{notice}</p>
					{/if}
					{@render children()}
				</div>
			</div>
		</div>
	</div>

	<nav class="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[440px] items-end justify-around border-t border-[#E2E8F0] bg-white/95 px-1 py-2 backdrop-blur lg:hidden">
		{#each nav as item}
			<a
				href={item.href}
				class="flex min-w-0 flex-1 flex-col items-center gap-1 text-center text-[10px] font-semibold {item.fab
					? '-mt-5 h-14 w-14 flex-none justify-center rounded-full bg-brand text-white shadow-lg'
					: current(item.href)
						? 'text-brand'
						: 'text-[#64748B]'}"
			>
				<span class="material-symbols-outlined">{item.icon}</span>
				{#if !item.fab}<span class="max-w-full truncate px-0.5">{item.label}</span>{/if}
			</a>
		{/each}
	</nav>
</div>
