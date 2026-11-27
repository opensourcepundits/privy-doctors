<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		role,
		title,
		intro = '',
		children,
		footer
	}: {
		role: 'patient' | 'doctor';
		title: string;
		intro?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const tabs = [
		{ id: 'patient', label: 'Patient', href: '/login', icon: 'person' },
		{ id: 'doctor', label: 'Doctor', href: '/doctors/login', icon: 'stethoscope' }
	] as const;

	const panel = {
		patient: {
			kicker: 'Patient portal',
			headline: 'Your visits, prescriptions and results, kept in one record.',
			points: ['Book and reschedule visits', 'Tests, results and certificates', 'Choose which doctors can open your chart']
		},
		doctor: {
			kicker: 'Clinic',
			headline: "The clinic day, the patient's chart and every referral in one place.",
			points: ["Today's schedule and bookings", 'Charts opened with patient consent', 'Consults, orders and referrals']
		}
	};
	const side = $derived(panel[role]);
</script>

<main class="scheme-{role} grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
	<aside class="hidden flex-col justify-between border-r border-line bg-white p-12 lg:flex xl:p-16">
		<p class="text-xl font-semibold tracking-tight">care<span class="font-mono font-medium text-brand">OS</span></p>
		<div class="max-w-md">
			<p class="kicker !text-brand">{side.kicker}</p>
			<p class="display mt-3 text-3xl leading-snug">{side.headline}</p>
			<ul class="mt-8 border-t border-line">
				{#each side.points as point, index}
					<li class="flex gap-4 border-b border-line py-3 text-[15px]">
						<span class="nums text-sm text-muted">0{index + 1}</span>{point}
					</li>
				{/each}
			</ul>
		</div>
		<p class="text-sm text-muted">Private practice</p>
	</aside>

	<div class="flex flex-col px-5 pt-6 pb-8 lg:items-center lg:justify-center lg:p-12">
		<div class="w-full max-w-[26rem]">
			<p class="text-xl font-semibold tracking-tight lg:hidden">care<span class="font-mono font-medium text-brand">OS</span></p>

			<nav class="mt-6 grid grid-cols-2 border-b border-line lg:mt-0" aria-label="Who is signing in">
				{#each tabs as tab}
					<a
						href={tab.href}
						aria-current={role === tab.id ? 'page' : undefined}
						class="scheme-{tab.id} -mb-px flex h-12 items-center justify-center gap-2 border-b-2 text-[15px] font-semibold {role === tab.id
							? 'border-brand text-brand'
							: 'border-transparent text-muted hover:text-ink'}"
					>
						<span class="material-symbols-outlined text-[20px]">{tab.icon}</span>
						{tab.label}
					</a>
				{/each}
			</nav>

			<h1 class="display mt-8 text-[1.75rem]">{title}</h1>
			{#if intro}<p class="mt-1 text-[15px] text-muted">{intro}</p>{/if}

			<div class="mt-6">
				{@render children()}
			</div>

			{#if footer}
				<div class="mt-6 border-t border-line pt-5 text-sm text-muted">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
</main>
