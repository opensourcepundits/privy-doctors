<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const severityLabel = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' } as const;
</script>

<header class="px-4 pt-6 lg:px-0">
	<a class="text-sm font-semibold text-brand" href="/patient">Home</a>
	<h1 class="display mt-2 text-2xl font-bold lg:text-3xl">Report something</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">File a headache, a fall, nausea, or anything else you noticed. You can attach a lab report or another document, and alert the clinicians you choose.</p>
</header>

<section class="mx-4 max-w-xl py-4 lg:mx-0">
	{#if data.preview}
		<article class="card text-sm">This report is filed when the patient is signed in.</article>
	{:else}
		<form class="card space-y-3" method="POST" enctype="multipart/form-data">
			{#if form?.message}
				<p class="text-sm text-red-600">{form.message}</p>
			{/if}
			<label class="block text-sm font-semibold" for="title">
				Title
				<input class="field mt-1" id="title" name="title" required maxlength="120" autocomplete="off" value={form?.title ?? ''} placeholder="Headache, big fall, nausea" />
			</label>
			<label class="block text-sm font-semibold" for="occurred-on">
				When it happened
				<input class="field mt-1" id="occurred-on" name="occurred_on" type="date" required max={data.today} value={form?.occurredOn ?? data.today} />
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
			{#if data.clinicians.length}
				<fieldset>
					<legend class="text-sm font-semibold">Alert a clinician</legend>
					<p class="mt-1 text-xs text-[#64748B]">Optional. Each person you tick gets a notification about this report.</p>
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
				</fieldset>
			{/if}
			<button class="btn" type="submit">
				<span class="material-symbols-outlined text-lg">personal_injury</span>
				Add to my history
			</button>
		</form>
	{/if}
</section>
