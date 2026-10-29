<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import { appointmentStatus } from '#lib/format';
	import type { OpenSlot } from '#lib/schedule';

	let {
		id,
		status,
		location = null,
		note = null,
		slots
	}: {
		id: number;
		status: string;
		location?: string | null;
		note?: string | null;
		slots: OpenSlot[];
	} = $props();

	const marker = $derived(appointmentStatus(status));
	const closed = $derived(status === 'declined' || status === 'cancelled');
	const kind = $derived(String(location ?? '').startsWith('At the patient') ? 'home' : 'clinic');
	const open = $derived(slots.filter((slot) => slot.kind === kind));
	const days = $derived([...new Map(open.map((slot) => [slot.date, slot.dateLabel])).entries()]);
	let day = $state('');
	const times = $derived(open.filter((slot) => slot.date === day));
</script>

<div class="mt-3">
	<Badge tone={marker.tone}>{marker.label}</Badge>
	{#if note}<p class="mt-1 text-sm text-[#64748B]">{note}</p>{/if}
</div>
{#if !closed}
	<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
		{#if status !== 'accepted' && status !== 'confirmed'}
			<form method="POST" action="?/accept">
				<input type="hidden" name="id" value={id} />
				<button class="text-sm font-semibold text-emerald-700" type="submit">Accept</button>
			</form>
		{/if}
		<details>
			<summary class="cursor-pointer text-sm font-semibold text-red-700">Decline</summary>
			<form class="mt-2 space-y-2" method="POST" action="?/decline">
				<input type="hidden" name="id" value={id} />
				<input class="field" name="note" maxlength="240" placeholder="Note to the patient, optional" />
				<button class="text-sm font-semibold text-red-700" type="submit">Decline this visit</button>
			</form>
		</details>
		<details>
			<summary class="cursor-pointer text-sm font-semibold text-brand">Reschedule</summary>
			{#if days.length}
				<form class="mt-2 space-y-2" method="POST" action="?/reschedule">
					<input type="hidden" name="id" value={id} />
					<label class="block text-sm font-semibold">
						Day
						<select class="field mt-1" bind:value={day} required>
							<option value="" disabled>Choose a day</option>
							{#each days as [value, label]}
								<option {value}>{label}</option>
							{/each}
						</select>
					</label>
					<label class="block text-sm font-semibold">
						Time
						{#key day}
							<select class="field mt-1" name="starts_at" required disabled={!day}>
								<option value="">Choose a time</option>
								{#each times as slot}
									<option value={slot.startsAt}>{slot.timeLabel}</option>
								{/each}
							</select>
						{/key}
					</label>
					<button class="text-sm font-semibold text-brand" type="submit" disabled={!day}>Save new time</button>
				</form>
			{:else}
				<p class="mt-2 text-sm text-[#64748B]">No open times in the next three weeks.</p>
			{/if}
		</details>
	</div>
{/if}
