<script lang="ts">
	import type { MedEntry } from '#lib/report-form';

	let { cards = $bindable() }: { cards: (MedEntry & { id: number })[] } = $props();

	function addMedicine() {
		if (cards.length >= 12) return;
		const id = cards.reduce((max, card) => Math.max(max, card.id), 0) + 1;
		cards.push({ id, name: '', dose: '' });
	}

	function removeMedicine(id: number) {
		const index = cards.findIndex((card) => card.id === id);
		if (index >= 0) cards.splice(index, 1);
	}
</script>

<fieldset>
	<legend class="text-sm font-semibold">Medicines taken</legend>
	<p class="mt-1 text-xs font-normal text-[#64748B]">Add each medicine on its own card. Dose is optional.</p>
	{#if cards.length}
		<div class="mt-2 space-y-2">
			{#each cards as card (card.id)}
				<article class="card space-y-2">
					<div class="flex items-center justify-between gap-2">
						<p class="text-xs font-semibold text-[#64748B]">Medicine</p>
						<button class="text-sm font-semibold text-[#A35D58]" type="button" onclick={() => removeMedicine(card.id)}>Remove</button>
					</div>
					<label class="block text-sm font-semibold">
						Name
						<input class="field mt-1" name="med_name" maxlength="80" autocomplete="off" bind:value={card.name} placeholder="Ibuprofen" />
					</label>
					<label class="block text-sm font-semibold">
						Dose
						<input class="field mt-1" name="med_dose" maxlength="80" autocomplete="off" bind:value={card.dose} placeholder="200 mg" />
					</label>
				</article>
			{/each}
		</div>
	{/if}
	{#if cards.length < 12}
		<button class="btn-line mt-2" type="button" onclick={addMedicine}>
			<span class="material-symbols-outlined text-lg">add</span>
			Add a medicine
		</button>
	{/if}
</fieldset>
