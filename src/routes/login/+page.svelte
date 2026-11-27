<script lang="ts">
	import AuthShell from '#lib/components/AuthShell.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<AuthShell role="patient" title="Sign in" intro="Use the email and password for your chart.">
	<form method="POST" class="space-y-2">
		<label class="block text-sm font-semibold" for="email">Email</label>
		<input class="field" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
		<label class="block pt-2 text-sm font-semibold" for="password">Password</label>
		<input class="field" id="password" name="password" type="password" autocomplete="current-password" required />
		{#if form?.message}<p class="text-sm text-red-700" role="alert">{form.message}</p>{/if}
		<div class="pt-3"><button class="btn btn-block" type="submit">Sign in</button></div>
	</form>
	{#snippet footer()}
		New here? <a class="font-semibold text-brand" href="/register">Create an account</a>
	{/snippet}
</AuthShell>
