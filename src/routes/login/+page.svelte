<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main class="scheme-patient flex min-h-dvh items-center justify-center bg-[#F3EEE6] px-4 py-10">
	<div class="w-full max-w-[480px] rounded-3xl border border-[#E2E8F0] bg-white px-6 py-8 shadow-xl lg:px-10 lg:py-10">
		<p class="kicker">Patient portal</p>
		<h1 class="display mt-2 text-3xl font-bold text-[#0F172A]">Sign in</h1>
		<p class="mt-2 text-sm text-[#64748B]">Use the email and password for your chart.</p>

		<form method="POST" class="mt-8 space-y-3">
			<label class="block text-sm font-semibold" for="email">Email</label>
			<input class="field" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
			<label class="block text-sm font-semibold" for="password">Password</label>
			<input class="field" id="password" name="password" type="password" autocomplete="current-password" required />
			{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
			<button class="btn btn-block" type="submit">Sign in</button>
		</form>

		<p class="mt-6 text-sm text-[#64748B]">
			New here? <a class="font-semibold text-brand" href="/register">Create an account</a>
		</p>
		<p class="mt-2 text-sm text-[#64748B]">
			Doctors <a class="font-semibold text-brand" href="/doctors/login">sign in here</a>.
		</p>
	</div>
</main>
