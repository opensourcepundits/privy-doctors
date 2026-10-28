<script lang="ts">
	import { ageOn, formatDate, formatTime, initials } from '#lib/format';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const patient = $derived(data.patient);
	let pass = $state<null | Awaited<PageProps['data']['pass']>>(null);
	let editing = $state<string | null>(null);
	let draft = $state('');
	let review = $state<{ field: string; value: string } | null>(null);
	let localMessage = $state('');

	const raw = $derived({
		first_name: patient.first_name,
		last_name: patient.last_name,
		dob: String(patient.dob).slice(0, 10),
		sex: patient.sex,
		blood_type: patient.blood_type ?? '',
		nic: patient.nic ?? '',
		passport: patient.passport ?? '',
		phone: patient.phone ?? '',
		email: pass?.email ?? '',
		conditions: patient.conditions.join('\n'),
		allergies: patient.allergies.join('\n'),
		surgeries: patient.surgeries.map((item) => `${item.year} — ${item.name}`).join('\n'),
		insurance_name: patient.insurance_name ?? '',
		insurance_group: patient.insurance_group ?? '',
		insurance_member: patient.insurance_member ?? ''
	});

	$effect(() => {
		let on = true;
		pass = null;
		data.pass.then((value) => {
			if (on) pass = value;
		});
		return () => {
			on = false;
		};
	});

	function shown(field: keyof typeof raw, value = raw[field]) {
		const text = value.trim();
		if (!text) return field === 'conditions' || field === 'allergies' || field === 'surgeries' ? 'None filed' : '—';
		if (field === 'dob') return formatDate(text);
		if (field === 'conditions' || field === 'allergies') {
			return text.split(/\n/).map((line) => line.trim()).filter(Boolean).join(' · ');
		}
		if (field === 'surgeries') {
			return text.split(/\n/).map((line) => line.trim()).filter(Boolean).join(' · ');
		}
		return text;
	}

	function begin(field: keyof typeof raw) {
		editing = field;
		draft = raw[field];
		review = null;
		localMessage = '';
	}

	function ask(field: keyof typeof raw) {
		if (shown(field, draft) === shown(field)) {
			localMessage = 'That is already on file.';
			review = null;
			return;
		}
		localMessage = '';
		review = { field, value: draft };
	}

	$effect(() => {
		if (!form?.field) return;
		editing = form.field;
		draft = form.value ?? '';
		review = null;
	});
</script>

{#snippet editor(field: keyof typeof raw, label: string, kind: 'text' | 'date' | 'tel' | 'email' | 'sex' | 'lines')}
	<div>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-[#64748B]">{label}</p>
				{#if editing !== field}
					<p class="mt-0.5">{shown(field)}</p>
				{/if}
			</div>
			{#if editing !== field}
				<button class="shrink-0 font-semibold text-brand" type="button" onclick={() => begin(field)}>Edit</button>
			{/if}
		</div>

		{#if editing === field && review?.field !== field}
			<div class="mt-2 space-y-2">
				{#if form?.message && form.field === field}
					<p class="text-sm text-red-600">{form.message}</p>
				{:else if localMessage}
					<p class="text-sm text-red-600">{localMessage}</p>
				{/if}
				{#if kind === 'lines'}
					<textarea class="field !min-h-24" bind:value={draft}></textarea>
					{#if field === 'surgeries'}
						<p class="text-xs text-[#64748B]">One procedure on each line, such as 1998 — Appendectomy.</p>
					{:else}
						<p class="text-xs text-[#64748B]">One item on each line.</p>
					{/if}
				{:else if kind === 'sex'}
					<select class="field" bind:value={draft}>
						<option value="Female">Female</option>
						<option value="Male">Male</option>
					</select>
				{:else}
					<input class="field" type={kind} bind:value={draft} autocomplete="off" />
				{/if}
				<div class="grid grid-cols-2 gap-2">
					<button class="btn" type="button" onclick={() => ask(field)}>Review change</button>
					<button class="btn-line" type="button" onclick={() => (editing = null)}>Cancel</button>
				</div>
			</div>
		{/if}

		{#if review?.field === field}
			<div class="mt-2 rounded-xl bg-[#F8FAFC] p-3">
				<p class="font-semibold">Confirm this update to {label.toLowerCase()}?</p>
				<p class="mt-2 text-[#64748B]">Now</p>
				<p>{shown(field)}</p>
				<p class="mt-2 text-[#64748B]">After confirmation</p>
				<p>{shown(field, review.value)}</p>
				<form class="mt-3 grid grid-cols-2 gap-2" method="POST" action="?/update">
					<input type="hidden" name="field" value={field} />
					<input type="hidden" name="value" value={review.value} />
					<input type="hidden" name="confirmed" value="yes" />
					<button class="btn" type="submit">Confirm update</button>
					<button class="btn-line" type="button" onclick={() => (review = null)}>Go back</button>
				</form>
			</div>
		{/if}
	</div>
{/snippet}

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Your account</p>
	<div class="mt-3 flex items-center gap-4">
		<div class="grid h-16 w-16 place-items-center rounded-full bg-brand text-lg font-bold text-white">
			{initials(patient.first_name, patient.last_name)}
		</div>
		<div>
			<h1 class="display text-2xl font-bold lg:text-3xl">{patient.first_name} {patient.last_name}</h1>
			<p class="text-sm text-[#64748B]">{ageOn(patient.dob)} years · {patient.sex} · {patient.pid}</p>
		</div>
	</div>
	<div class="mt-4 flex flex-wrap gap-2">
		<a class="btn" href="/patient/prescriptions">
			<span class="material-symbols-outlined text-lg">medication</span>
			Prescriptions
		</a>
		<a class="btn" href="/patient/billing">
			<span class="material-symbols-outlined text-lg">receipt_long</span>
			Billing
		</a>
		<a class="btn" href="/patient/physicians">
			<span class="material-symbols-outlined text-lg">stethoscope</span>
			My physicians
		</a>
	</div>
</header>

<section class="cards-2 px-4 py-4 text-sm lg:px-0">
	{#if !pass}
		<article class="card span-2">
			<p class="kicker">Record access</p>
			<p class="mt-2">Show this code to a clinician. Scanning it adds them to My physicians and opens your full history. You are notified when that happens.</p>
			<div class="mt-4"><Skeleton count={1} /></div>
		</article>
	{:else if pass.qr}
		<article class="card span-2">
			<p class="kicker">Record access</p>
			<p class="mt-2">Show this code to a clinician. Scanning it adds them to My physicians and opens your full history. You are notified when that happens.</p>
			<img class="mx-auto mt-4 w-52 rounded-xl bg-white p-2" src={pass.qr} width="208" height="208" alt="QR code for {patient.first_name} {patient.last_name}'s medical record" />
			{#if !data.preview}
				{#if pass.code}
					<p class="mt-4 text-[#64748B]">Access code</p>
					<p class="nums font-mono text-2xl tracking-widest">{pass.code.code}</p>
					<p class="text-[#64748B]">Expires {formatDate(pass.code.expires_at)} · {formatTime(pass.code.expires_at)}. It works once.</p>
				{:else}
					<p class="mt-4 text-[#64748B]">If a camera is not available, create a code the clinician can type. It works once and expires in 24 hours.</p>
				{/if}
				<form class="mt-4" method="POST" action="?/code">
					<button class="btn" type="submit">{pass.code ? 'Create a new access code' : 'Create access code'}</button>
				</form>
				{#if pass.code}
					<p class="mt-2 text-[#64748B]">Creating a new code replaces the one above.</p>
				{/if}
			{/if}
		</article>
	{/if}
	<article class="card space-y-3">
		<p class="kicker">Identity</p>
		{@render editor('first_name', 'First name', 'text')}
		{@render editor('last_name', 'Last name', 'text')}
		{@render editor('dob', 'Date of birth', 'date')}
		{@render editor('sex', 'Sex', 'sex')}
		{@render editor('blood_type', 'Blood type', 'text')}
		{@render editor('nic', 'NIC', 'text')}
		{@render editor('passport', 'Passport', 'text')}
		{@render editor('phone', 'Phone', 'tel')}
		{@render editor('email', 'Email', 'email')}
	</article>

	<article class="card space-y-3">
		<p class="kicker">Clinical profile</p>
		{@render editor('conditions', 'Conditions', 'lines')}
		{@render editor('allergies', 'Allergies', 'lines')}
		{@render editor('surgeries', 'Procedures', 'lines')}
	</article>

	<article class="card space-y-3">
		<p class="kicker">Insurance</p>
		{@render editor('insurance_name', 'Plan', 'text')}
		{@render editor('insurance_group', 'Group', 'text')}
		{@render editor('insurance_member', 'Member', 'text')}
	</article>

	{#if !pass}
		<article class="card span-2">
			<p class="kicker">Care team</p>
			<div class="mt-3"><Skeleton count={1} /></div>
		</article>
	{:else if pass.clinician}
		<article class="card span-2">
			<p class="kicker">Care team</p>
			<p class="mt-3 font-semibold">{pass.clinician.name}, {pass.clinician.credentials}</p>
			<p>{pass.clinician.specialty} · {pass.clinician.practice}</p>
			<p class="text-[#64748B]">{pass.clinician.location}</p>
			{#if pass.clinician.phone}<p class="mt-1">Concierge line {pass.clinician.phone}</p>{/if}
		</article>
	{/if}

	<div class="span-2 flex flex-col gap-3 sm:flex-row">
		<a class="btn" href="/patient/help">Contact care team</a>
		{#if !data.preview}
			<form method="POST" action="/logout"><button class="btn-line" type="submit">Sign out</button></form>
		{/if}
	</div>
</section>
