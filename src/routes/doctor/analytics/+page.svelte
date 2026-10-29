<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let seen = $state<Record<string, number>>({});
	let ready = $state<Record<string, boolean>>({});
	const frames = new Map<string, number>();

	$effect(() => () => {
		for (const frame of frames.values()) cancelAnimationFrame(frame);
	});

	function startCount(id: string) {
		if (frames.has(id) || (seen[id] ?? 0) >= 1) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			seen[id] = 1;
			return;
		}
		const started = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - started) / 1100);
			seen[id] = 1 - (1 - t) ** 3;
			if (t < 1) frames.set(id, requestAnimationFrame(step));
			else frames.delete(id);
		};
		frames.set(id, requestAnimationFrame(step));
	}

	function reveal(node: HTMLElement) {
		const id = node.dataset.reveal;
		if (!id) return;
		let observer: IntersectionObserver | undefined;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mobile = window.matchMedia('(max-width: 1023px)').matches;
		const start = () => {
			if (ready[id]) return;
			ready[id] = true;
			startCount(id);
		};
		const displayed = () => node.getBoundingClientRect().top < window.innerHeight - 96;
		if (reduced || !mobile || displayed()) start();
		else {
			observer = new IntersectionObserver(
				(entries) => {
					if (entries.some((entry) => entry.isIntersecting)) {
						observer?.disconnect();
						start();
					}
				},
				{ rootMargin: '0px 0px -96px 0px', threshold: 0 }
			);
			observer.observe(node);
		}
		return () => observer?.disconnect();
	}

	function count(value: string | number, id: string) {
		const raw = String(value);
		const match = /^([+-]?)(\d+(?:\.\d+)?)(.*)$/.exec(raw);
		const progress = seen[id] ?? 0;
		if (!match || progress >= 1) return raw;
		const decimals = match[2].includes('.') ? match[2].split('.')[1].length : 0;
		const current = Number(match[2]) * progress;
		const shown = decimals ? current.toFixed(decimals) : String(Math.round(current));
		return match[1] + shown + match[3];
	}
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Practice stream</p>
	<h1 class="display text-2xl font-bold">Practice analytics</h1>
	<p class="text-sm text-[#64748B]">Encounter capacity, diagnostic yield, and inflow metrics</p>
	<div class="action-row mt-4">
		<a class="btn" href="/doctor/analytics/patients">
			<span class="material-symbols-outlined text-lg">group</span>
			My patients
		</a>
	</div>
</header>

{#await data.report}
	<div class="space-y-6 px-4 pt-4 lg:px-0">
		<Skeleton kind="stats" count={4} />
		<div>
			<h2 class="display text-lg font-semibold">Diagnostic modality volume</h2>
			<div class="mt-3"><Skeleton count={1} /></div>
		</div>
		<div>
			<h2 class="display text-lg font-semibold">Cohort and risk stratification</h2>
			<div class="mt-3"><Skeleton count={3} /></div>
		</div>
		<div>
			<h2 class="display text-lg font-semibold">Referral colleague inflow</h2>
			<div class="mt-3"><Skeleton count={3} /></div>
		</div>
	</div>
{:then report}
	<section class="grid grid-cols-2 gap-3 px-4 pt-4 lg:grid-cols-4 lg:px-0" class:shown={ready.metrics} data-reveal="metrics" {@attach reveal}>
		{#each report.metrics as metric, index}
			<article class="card rise" style="--delay: {index * 70}ms">
				<p class="text-xs font-semibold text-brand">{count(metric.delta, 'metrics')}</p>
				<p class="display nums mt-1 text-3xl font-bold">{count(metric.value, 'metrics')}</p>
				<p class="text-sm font-semibold">{metric.label}</p>
				<p class="text-xs text-[#64748B]">{metric.caption}</p>
			</article>
		{/each}
	</section>

	<section class="px-4 pt-6 lg:px-0" class:shown={ready.modality} data-reveal="modality" {@attach reveal}>
		<div class="mb-3 flex items-end justify-between">
			<h2 class="display text-lg font-semibold">Diagnostic modality volume</h2>
			<p class="nums text-sm text-[#64748B]">{count(report.modalityTotal, 'modality')} total</p>
		</div>
		<div class="card rise space-y-3">
			{#each report.modalities as item, index}
				<div>
					<div class="mb-1 flex justify-between text-sm">
						<span>{item.name}</span>
						<span class="nums text-[#64748B]">{count(item.units, 'modality')} · {count(item.share, 'modality')}%</span>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-brand-soft">
						<div class="meter h-2 rounded-full bg-brand" style="--share: {item.share}%; --delay: {160 + index * 80}ms; --mobile-delay: {80 + index * 70}ms"></div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="grid items-start gap-6 lg:grid-cols-2">
		<section class="px-4 pt-6 lg:px-0">
			<h2 class="display text-lg font-semibold">Cohort and risk stratification</h2>
			<p class="text-sm text-[#64748B]" class:shown={ready.panel} data-reveal="panel" {@attach reveal}>Active cardiology panel · N = {count(report.panel, 'panel')}</p>
			<div class="mt-3 space-y-3">
				{#each report.cohorts as cohort, index}
					<div class:shown={ready[`cohort-${index}`]} data-reveal="cohort-{index}" {@attach reveal}>
					<article class="card rise" style="--delay: {index * 80}ms">
						<div class="flex items-center justify-between">
							<p class="font-semibold">{cohort.name}</p>
							<p class="nums text-sm">{count(cohort.share, `cohort-${index}`)}% ({count(cohort.patients, `cohort-${index}`)} pts)</p>
						</div>
						<div class="mt-2 h-2 overflow-hidden rounded-full bg-brand-soft">
							<div class="meter h-2 rounded-full bg-brand-accent" style="--share: {cohort.share}%; --delay: {200 + index * 90}ms; --mobile-delay: 120ms"></div>
						</div>
					</article>
					</div>
				{/each}
			</div>
			<div class:shown={ready.note} data-reveal="note" {@attach reveal}>
				<p class="card rise mt-3 text-sm" style="--delay: 320ms">{report.note}</p>
			</div>
		</section>

		<section class="px-4 py-6 lg:px-0">
			<h2 class="display text-lg font-semibold">Referral colleague inflow</h2>
			<p class="text-sm text-[#64748B]" class:shown={ready.referrals} data-reveal="referrals" {@attach reveal}>{count(report.referralTotal, 'referrals')} total intakes</p>
			<div class="mt-3 space-y-3">
				{#each report.referrals as source, index}
					<div class:shown={ready[`referral-${index}`]} data-reveal="referral-{index}" {@attach reveal}>
					<article class="card rise" style="--delay: {index * 80}ms">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-semibold"><Mention text={source.name} /></p>
								<p class="text-sm text-[#64748B]">{source.channel} · {count(source.share, `referral-${index}`)}%</p>
							</div>
							<p class="nums font-semibold">{count(source.patients, `referral-${index}`)} pts</p>
						</div>
						<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
							<div class="meter h-1.5 rounded-full bg-brand" style="--share: {source.share}%; --delay: {200 + index * 90}ms; --mobile-delay: 120ms"></div>
						</div>
					</article>
					</div>
				{/each}
			</div>
		</section>
	</div>
{:catch}
	<p class="px-4 pt-4 text-sm text-[#64748B] lg:px-0">The practice figures could not be loaded.</p>
{/await}

<style>
	.meter {
		width: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.shown .meter {
			animation-name: meter;
			animation-duration: 0.95s;
			animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
			animation-fill-mode: forwards;
			animation-delay: var(--mobile-delay, 80ms);
		}
	}

	@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
		.rise {
			animation-name: rise;
			animation-duration: 0.7s;
			animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
			animation-fill-mode: both;
			animation-delay: var(--delay, 0ms);
			animation-play-state: paused;
		}

		.shown .rise {
			animation-play-state: running;
		}

		.shown .meter {
			animation-delay: var(--delay, 0ms);
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes meter {
		to {
			width: var(--share);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shown .rise,
		.shown .meter {
			animation: none;
		}

		.meter {
			width: var(--share);
		}
	}
</style>
