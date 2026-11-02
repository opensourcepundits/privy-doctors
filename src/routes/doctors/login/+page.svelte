<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main class="scheme-doctor flex min-h-dvh items-center justify-center bg-[#E7EEF6] px-4 py-10">
	<div class="w-full max-w-[480px] rounded-3xl border border-[#E2E8F0] bg-white px-6 py-8 shadow-xl lg:px-10 lg:py-10">
		<p class="kicker">Clinic</p>
		<h1 class="display mt-2 text-3xl font-bold text-[#0F172A]">Doctor sign in</h1>
		<p class="mt-2 text-sm text-[#64748B]">Use the email issued after your clinic account is verified.</p>

		<form method="POST" class="mt-8 space-y-3">
			<label class="block text-sm font-semibold" for="email">Email</label>
			<input class="field" id="email" name="email" type="email" autocomplete="username" required value={form?.email ?? ''} />
			<label class="block text-sm font-semibold" for="password">Password</label>
			<input class="field" id="password" name="password" type="password" autocomplete="current-password" required />
			{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
			<button class="btn btn-block" type="submit">Sign in</button>
		</form>

		<p class="mt-6 text-sm text-[#64748B]">
			Patients <a class="font-semibold text-brand" href="/login">sign in here</a>.
		</p>
	</div>
</main>
