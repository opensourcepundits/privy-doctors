<script lang="ts">
	import ReportMedCards from '#lib/components/ReportMedCards.svelte';
	import { isReportKind, reportKinds, reportShows, type MedEntry, type SelfReportDraft } from '#lib/report-form';

	let {
		today,
		values,
		message = '',
		clinicians,
		attachments = false,
		submitLabel,
		submitIcon = '',
		kicker = ''
	}: {
		today: string;
		values: SelfReportDraft;
		message?: string;
		clinicians?: { id: number; name: string; credentials: string; specialty: string }[];
		attachments?: boolean;
		submitLabel: string;
		submitIcon?: string;
		kicker?: string;
	} = $props();

	const severityLabel = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' } as const;
	function snapshot() {
		return {
			kind: values.kind,
			title: values.title,
			occurredOn: values.occurredOn,
			endedOn: values.endedOn,
			location: values.location,
			duration: values.duration,
			severity: values.severity,
			detail: values.detail,
			ongoing: values.ongoing,
			meds: values.meds.map((med: MedEntry) => ({ name: med.name, dose: med.dose }))
		};
	}
	const draft = snapshot();
	let kind = $state(isReportKind(draft.kind) ? draft.kind : '');
	let title = $state(draft.title);
	let occurredOn = $state(draft.occurredOn);
	let endedOn = $state(draft.endedOn);
	let location = $state(draft.location);
	let ongoing = $state(draft.ongoing);
	let duration = $state(draft.duration);
	let severity = $state(draft.severity);
	let detail = $state(draft.detail);
	let cards = $state(draft.meds.map((med: MedEntry, index: number) => ({ id: index + 1, name: med.name, dose: med.dose })));
	let showPhysicians = $state(false);
	const modules = $derived(reportShows(kind));
</script>

<form class="card space-y-3" method="POST" enctype={attachments ? 'multipart/form-data' : undefined}>
	{#if kicker}
		<p class="kicker">{kicker}</p>
	{/if}
	{#if message}
		<p class="text-sm text-red-600">{message}</p>
	{/if}
	<label class="block text-sm font-semibold" for="kind">
		What you are reporting
		<select class="field mt-1" id="kind" name="kind" required bind:value={kind}>
			{#if !kind}
				<option value="">Choose</option>
			{/if}
			{#each reportKinds as [value, label] (value)}
				<option {value}>{label}</option>
			{/each}
		</select>
	</label>
	<label class="block text-sm font-semibold" for="title">
		Title
		<input class="field mt-1" id="title" name="title" required maxlength="120" autocomplete="off" bind:value={title} placeholder={kind === 'scan' ? 'Chest X-ray, MRI brain' : 'Headache, big fall, nausea'} />
	</label>
	{#if modules.range}
		<label class="block text-sm font-semibold" for="occurred-on">
			Started
			<input class="field mt-1" id="occurred-on" name="occurred_on" type="date" required max={today} bind:value={occurredOn} />
		</label>
	{:else}
		<label class="block text-sm font-semibold" for="occurred-on">
			When it happened
			<input class="field mt-1" id="occurred-on" name="occurred_on" type="date" required max={today} bind:value={occurredOn} />
		</label>
	{/if}
	<label class="flex items-center gap-2 text-sm font-semibold">
		<input type="checkbox" name="ongoing" value="yes" bind:checked={ongoing} />
		It is still going on
	</label>
	{#if modules.range && !ongoing}
		<label class="block text-sm font-semibold" for="ended-on">
			Ended
			<input class="field mt-1" id="ended-on" name="ended_on" type="date" required min={occurredOn} max={today} bind:value={endedOn} />
		</label>
	{/if}
	<label class="block text-sm font-semibold" for="location">
		Where it happened
		<input class="field mt-1" id="location" name="location" maxlength="160" autocomplete="off" bind:value={location} placeholder={kind === 'scan' ? 'Clinic or hospital where the scan was done' : 'Home, clinic, or another place'} />
		<span class="mt-1 block text-xs font-normal text-[#64748B]">{kind === 'scan' ? 'Name the place where the scan was done.' : 'Optional. For a scan, name the place it was done.'}</span>
	</label>
	{#if modules.symptom}
		<label class="block text-sm font-semibold" for="duration">
			How long it lasted
			<input class="field mt-1" id="duration" name="duration" maxlength="80" autocomplete="off" bind:value={duration} placeholder="About 2 hours" />
		</label>
		<label class="block text-sm font-semibold" for="severity">
			How strong it felt
			<select class="field mt-1" id="severity" name="severity" bind:value={severity}>
				<option value="">Not sure</option>
				{#each Object.entries(severityLabel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</label>
	{/if}
	<ReportMedCards bind:cards />
	<label class="block text-sm font-semibold" for="detail">
		Notes
		<textarea class="field mt-1 min-h-28" id="detail" name="detail" maxlength="1000" placeholder="Anything a clinician should know" bind:value={detail}></textarea>
	</label>
	{#if attachments}
		<label class="block text-sm font-semibold" for="files">
			Lab report or supporting document
			<input class="mt-1 block w-full text-sm" id="files" name="files" type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf" />
			<span class="mt-1 block text-xs font-normal text-[#64748B]">Images or PDFs. Up to 4 files, 8 MB each.</span>
		</label>
	{/if}
	{#if clinicians}
		<div>
			<button class="btn-line" type="button" aria-expanded={showPhysicians} onclick={() => (showPhysicians = !showPhysicians)}>
				<span class="material-symbols-outlined text-lg">{showPhysicians ? 'visibility_off' : 'visibility'}</span>
				{showPhysicians ? 'Hide physicians' : 'Tell a physician'}
			</button>
			<div class={showPhysicians ? 'mt-2' : 'hidden'}>
				<fieldset>
					<legend class="text-sm font-semibold">Physicians with access</legend>
					<p class="mt-1 text-xs text-[#64748B]">Only clinicians who can already open your record are listed. Each person you tick gets a notification.</p>
					{#if clinicians.length}
						<div class="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
							{#each clinicians as clinician (clinician.id)}
								<label class="flex items-start gap-2 text-sm">
									<input class="mt-1" type="checkbox" name="doctor_id" value={clinician.id} />
									<span>
										<span class="font-semibold">{clinician.name}</span>
										<span class="block text-xs text-[#64748B]">{clinician.credentials} · {clinician.specialty}</span>
									</span>
								</label>
							{/each}
						</div>
					{:else}
						<p class="mt-2 text-sm text-[#64748B]">No physician with access to your record can be told yet. They appear here after you allow access.</p>
					{/if}
				</fieldset>
			</div>
		</div>
	{/if}
	<button class="btn" type="submit">
		{#if submitIcon}
			<span class="material-symbols-outlined text-lg">{submitIcon}</span>
		{/if}
		{submitLabel}
	</button>
</form>
