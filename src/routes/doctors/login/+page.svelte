<script lang="ts">
	import AuthShell from '#lib/components/AuthShell.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<AuthShell role="doctor" title="Sign in to the clinic" intro="Use the email from your clinic account.">
	<form method="POST" class="space-y-2">
		<label class="block text-sm font-semibold" for="email">Clinic email</label>
		<input class="field" id="email" name="email" type="email" autocomplete="username" required value={form?.email ?? ''} />
		<label class="block pt-2 text-sm font-semibold" for="password">Password</label>
		<input class="field" id="password" name="password" type="password" autocomplete="current-password" required />
		{#if form?.message}<p class="text-sm text-red-700" role="alert">{form.message}</p>{/if}
		<div class="pt-3"><button class="btn btn-block" type="submit">Sign in</button></div>
	</form>
	{#snippet footer()}
		Invited by a colleague? Open the link in their message to set up your account.
	{/snippet}
</AuthShell>
