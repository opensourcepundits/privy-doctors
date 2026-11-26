<script lang="ts">
	import { reportKinds } from '#lib/report-form';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const severityLabel = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' } as const;
	let kind = $state(form?.kind ?? 'symptom');
	let showPhysicians = $state(false);
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient">Home</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">Report something</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">File a symptom, treatment, medicine, scan, or another event. You can attach a document and tell a physician who already has access to your record.</p>
</header>

<section class="mx-4 max-w-xl py-4 lg:mx-0">
	<form class="card space-y-3" method="POST" enctype="multipart/form-data">
		{#if form?.message}
			<p class="text-sm text-red-600">{form.message}</p>
		{/if}
		<label class="block text-sm font-semibold" for="kind">
			What you are reporting
			<select class="field mt-1" id="kind" name="kind" required bind:value={kind}>
				{#each reportKinds as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
		</label>
		<label class="block text-sm font-semibold" for="title">
			Title
			<input class="field mt-1" id="title" name="title" required maxlength="120" autocomplete="off" value={form?.title ?? ''} placeholder={kind === 'scan' ? 'Chest X-ray, MRI brain' : 'Headache, big fall, nausea'} />
		</label>
		<label class="block text-sm font-semibold" for="occurred-on">
			When it happened
			<input class="field mt-1" id="occurred-on" name="occurred_on" type="date" required max={data.today} value={form?.occurredOn ?? data.today} />
		</label>
		<label class="block text-sm font-semibold" for="location">
			Where it happened
			<input class="field mt-1" id="location" name="location" maxlength="160" autocomplete="off" value={form?.location ?? ''} placeholder={kind === 'scan' ? 'Clinic or hospital where the scan was done' : 'Home, clinic, or another place'} />
			<span class="mt-1 block text-xs font-normal text-[#64748B]">{kind === 'scan' ? 'Name the place where the scan was done.' : 'Optional. For a scan, name the place it was done.'}</span>
		</label>
		<label class="block text-sm font-semibold" for="duration">
			How long it lasted
			<input class="field mt-1" id="duration" name="duration" maxlength="80" autocomplete="off" value={form?.duration ?? ''} placeholder="About 2 hours" />
		</label>
		<label class="flex items-center gap-2 text-sm font-semibold">
			<input type="checkbox" name="ongoing" value="yes" checked={form?.ongoing ?? false} />
			It is still going on
		</label>
		<label class="block text-sm font-semibold" for="severity">
			How strong it felt
			<select class="field mt-1" id="severity" name="severity">
				<option value="" selected={!form?.severity}>Not sure</option>
				{#each Object.entries(severityLabel) as [value, label]}
					<option {value} selected={form?.severity === value}>{label}</option>
				{/each}
			</select>
		</label>
		<label class="block text-sm font-semibold" for="meds">
			Medicines taken
			<input class="field mt-1" id="meds" name="meds_taken" maxlength="240" autocomplete="off" value={form?.meds ?? ''} placeholder="Ibuprofen 200 mg, or none" />
		</label>
		<label class="block text-sm font-semibold" for="detail">
			What you noticed
			<textarea class="field mt-1 min-h-28" id="detail" name="detail" maxlength="1000" placeholder="Where it is, what set it off, and anything else a clinician should know">{form?.detail ?? ''}</textarea>
		</label>
		<label class="block text-sm font-semibold" for="files">
			Lab report or supporting document
			<input class="mt-1 block w-full text-sm" id="files" name="files" type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf" />
			<span class="mt-1 block text-xs font-normal text-[#64748B]">Images or PDFs. Up to 4 files, 8 MB each.</span>
		</label>
		<div>
			<button class="btn-line" type="button" aria-expanded={showPhysicians} onclick={() => (showPhysicians = !showPhysicians)}>
				<span class="material-symbols-outlined text-lg">{showPhysicians ? 'visibility_off' : 'visibility'}</span>
				{showPhysicians ? 'Hide physicians' : 'Tell a physician'}
			</button>
			<div class={showPhysicians ? 'mt-2' : 'hidden'}>
				<fieldset>
					<legend class="text-sm font-semibold">Physicians with access</legend>
					<p class="mt-1 text-xs text-[#64748B]">Only clinicians who can already open your record are listed. Each person you tick gets a notification.</p>
					{#if data.clinicians.length}
						<div class="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
							{#each data.clinicians as clinician}
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
		<button class="btn" type="submit">
			<span class="material-symbols-outlined text-lg">personal_injury</span>
			Add to my history
		</button>
	</form>
</section>
