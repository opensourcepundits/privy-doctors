<script lang="ts">
	import AuthShell from '#lib/components/AuthShell.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<AuthShell role="patient" title="Create an account" intro="This opens your chart. Doctor accounts are issued after verification.">
	<form method="POST" class="space-y-3">
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="block text-sm font-semibold" for="firstName">First name</label>
				<input class="field" id="firstName" name="firstName" autocomplete="given-name" required value={form?.firstName ?? ''} />
			</div>
			<div>
				<label class="block text-sm font-semibold" for="lastName">Last name</label>
				<input class="field" id="lastName" name="lastName" autocomplete="family-name" required value={form?.lastName ?? ''} />
			</div>
		</div>
		<div>
			<label class="block text-sm font-semibold" for="otherNames">Other names</label>
			<input class="field" id="otherNames" name="otherNames" maxlength="120" autocomplete="off" value={form?.otherNames ?? ''} />
			<p class="mt-1 text-xs text-muted">Maiden name, nickname, or any other name you use. Optional.</p>
		</div>
		<label class="block text-sm font-semibold" for="email">Email</label>
		<input class="field" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
		<label class="block text-sm font-semibold" for="password">Password</label>
		<input class="field" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
		<label class="block text-sm font-semibold" for="sex">Sex</label>
		<select class="field" id="sex" name="sex" required>
			<option value="" disabled selected={form?.sex !== 'Female' && form?.sex !== 'Male'}>Choose</option>
			<option value="Female" selected={form?.sex === 'Female'}>Female</option>
			<option value="Male" selected={form?.sex === 'Male'}>Male</option>
		</select>
		<label class="block text-sm font-semibold" for="dob">Date of birth</label>
		<input class="field" id="dob" name="dob" type="date" value={form?.dob ?? ''} />
		<label class="block text-sm font-semibold" for="phone">Phone</label>
		<input class="field" id="phone" name="phone" type="tel" autocomplete="tel" value={form?.phone ?? ''} />
		{#if form?.message}<p class="text-sm text-red-700">{form.message}</p>{/if}
		<button class="btn btn-block" type="submit">Create account</button>
	</form>
	{#snippet footer()}
		<p>Already registered? <a class="font-semibold text-brand" href="/login">Sign in</a></p>
		<p class="mt-2">Seen at the clinic already? Open the link your clinician sent. It keeps those consultations on your timeline.</p>
	{/snippet}
</AuthShell>
