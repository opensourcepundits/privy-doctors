<script lang="ts">
	import { isoDate } from '#lib/format';

	type Shot = {
		id: number;
		name: string;
		given_on: Date | string | null;
		source: string;
		note: string | null;
		lot: string | null;
		site: string | null;
		proof_name: string | null;
		doctor_name: string | null;
		credentials: string | null;
	};

	let { shots, viewer = 'patient' }: { shots: Shot[]; viewer?: 'patient' | 'doctor' } = $props();

	function calendarDate(value: Date | string | null) {
		const iso = isoDate(value);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
		const [year, month, day] = iso.split('-').map(Number);
		return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
	}

	function sourceLabel(source: string) {
		if (source === 'given') return 'Given in clinic';
		if (source === 'self') return viewer === 'doctor' ? 'Added by the patient' : 'Added by you';
		if (source === 'ordered') return 'Ordered, then recorded';
		return 'Recorded';
	}
</script>

{#if shots.length}
	<ul class="space-y-3">
		{#each shots as shot}
			<li class="card">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="font-semibold">{shot.name}</p>
						<p class="text-sm text-[#64748B]">{sourceLabel(shot.source)}{#if shot.given_on} · {calendarDate(shot.given_on)}{/if}</p>
					</div>
					<span class="material-symbols-outlined text-brand">vaccines</span>
				</div>
				{#if shot.doctor_name}
					<p class="mt-2 text-sm">{shot.doctor_name}{shot.credentials ? `, ${shot.credentials}` : ''}</p>
				{/if}
				{#if shot.site || shot.lot}
					<p class="mt-1 text-sm text-[#64748B]">{[shot.site, shot.lot ? `Lot ${shot.lot}` : ''].filter(Boolean).join(' · ')}</p>
				{/if}
				{#if shot.note}<p class="mt-1 text-sm">{shot.note}</p>{/if}
				{#if shot.proof_name}
					<a class="mt-3 block overflow-hidden rounded-xl border border-[#E2E8F0]" href="/files/vaccinations/{shot.id}" target="_blank" rel="noreferrer">
						<img class="max-h-64 w-full bg-white object-contain" src="/files/vaccinations/{shot.id}" alt="Proof for {shot.name}" />
						<span class="block px-3 py-2 text-xs text-[#64748B]">{shot.proof_name}</span>
					</a>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-sm text-[#64748B]">No vaccinations recorded yet.</p>
{/if}
