<script lang="ts">
	import { dayRelation, formatLongDate, formatTime } from '#lib/format';

	type Slot = { startsAt: string; label: string };

	let {
		id,
		status,
		mode = 'doctor',
		note = '',
		slots = []
	}: {
		id: number;
		status: string;
		mode?: 'doctor' | 'patient';
		note?: string | null;
		slots?: Slot[];
	} = $props();

	const days = $derived.by(() => {
		const seen = new Map<string, string>();
		for (const slot of slots) {
			const day = slot.startsAt.slice(0, 10);
			if (!seen.has(day)) seen.set(day, `${dayRelation(day)} · ${formatLongDate(day)}`);
		}
		return [...seen].map(([value, label]) => ({ value, label }));
	});

	let day = $state('');
	const chosen = $derived(days.some((item) => item.value === day) ? day : (days[0]?.value ?? ''));
	const times = $derived(slots.filter((slot) => slot.startsAt.slice(0, 10) === chosen));

	let override = $state<'approve' | 'decline' | 'reschedule' | '' | null>(null);
	const picked = $derived(
		override ??
			(status === 'accepted' || status === 'confirmed' ? 'approve' : status === 'rescheduled' ? 'reschedule' : status === 'declined' ? 'decline' : '')
	);
	function choose(kind: 'approve' | 'decline' | 'reschedule') {
		if (kind === 'approve' && (status === 'accepted' || status === 'confirmed')) {
			override = 'approve';
			return;
		}
		const fallback = status === 'accepted' || status === 'confirmed' ? 'approve' : '';
		override = picked === kind ? fallback : kind;
	}
	const approved = $derived(status === 'accepted' || status === 'confirmed');
	const movable = $derived(approved || status === 'rescheduled');

	function tone(kind: 'approve' | 'decline' | 'reschedule', on: boolean) {
		const shape = 'rounded-lg px-3 py-1.5 text-sm font-semibold';
		if (!on) return `${shape} bg-[#E2E8F0] text-[#64748B]`;
		if (kind === 'approve') return `${shape} bg-emerald-700 text-white`;
		if (kind === 'decline') return `${shape} bg-red-700 text-white`;
		return `${shape} bg-brand text-white`;
	}
</script>

{#if note}
	<p class="mt-2 text-sm text-[#64748B]">{note}</p>
{/if}

{#snippet rescheduleForm()}
	<form class="mt-3 grid gap-2" method="POST" action="?/reschedule">
		<input name="id" type="hidden" value={id} />
		<label class="grid gap-1 text-sm text-[#334155]">
			Day
			<select class="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2" name="day" bind:value={day}>
				{#each days as item (item.value)}
					<option value={item.value}>{item.label}</option>
				{/each}
			</select>
		</label>
		<label class="grid gap-1 text-sm text-[#334155]">
			Time
			{#key chosen}
				<select class="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2" name="starts_at" required disabled={!times.length}>
					{#each times as slot (slot.startsAt)}
						<option value={slot.startsAt}>{formatTime(slot.startsAt)}</option>
					{/each}
				</select>
			{/key}
		</label>
		{#if !times.length}
			<p class="text-xs text-[#64748B]">No open times in the next three weeks.</p>
		{/if}
		<button class="justify-self-start rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50" disabled={!times.length}>
			Move visit
		</button>
	</form>
{/snippet}

{#if mode === 'patient' && movable}
	<div class="mt-3">
		<button class={tone('reschedule', picked === 'reschedule')} type="button" onclick={() => choose('reschedule')}>
			Reschedule
		</button>
		{#if picked === 'reschedule'}
			{@render rescheduleForm()}
		{/if}
	</div>
{:else if mode === 'doctor' && status !== 'declined' && status !== 'cancelled'}
	<div class="mt-3 flex flex-wrap gap-2">
		{#if approved}
			<button class={tone('approve', picked === 'approve')} type="button" onclick={() => choose('approve')}>Approve</button>
		{:else}
			<form method="POST" action="?/accept">
				<input name="id" type="hidden" value={id} />
				<button class={tone('approve', picked === 'approve')}>Approve</button>
			</form>
		{/if}
		<button class={tone('decline', picked === 'decline')} type="button" onclick={() => choose('decline')}>Decline</button>
		<button class={tone('reschedule', picked === 'reschedule')} type="button" onclick={() => choose('reschedule')}>
			Reschedule
		</button>
	</div>
	{#if picked === 'decline'}
		<form class="mt-3 grid gap-2" method="POST" action="?/decline">
			<input name="id" type="hidden" value={id} />
			<label class="grid gap-1 text-sm text-[#334155]">
				Note for the patient
				<textarea class="min-h-16 rounded-lg border border-[#E2E8F0] px-3 py-2" name="note" maxlength="240" placeholder="Optional"></textarea>
			</label>
			<button class="justify-self-start rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">Decline visit</button>
		</form>
	{/if}
	{#if picked === 'reschedule'}
		{@render rescheduleForm()}
	{/if}
{/if}
