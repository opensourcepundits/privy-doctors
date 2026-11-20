<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const preview = $derived(data.preview);
</script>

<main class="scheme-doctor flex min-h-dvh items-center justify-center bg-[#E7EEF6] px-4 py-10">
	<div class="w-full max-w-[480px] rounded-3xl border border-[#E2E8F0] bg-white px-6 py-8 shadow-xl lg:px-10 lg:py-10">
		<p class="kicker">Clinic</p>
		<h1 class="display mt-2 text-3xl font-bold text-[#0F172A]">Join as a colleague</h1>
		{#if !preview}
			<p class="mt-2 text-sm text-[#64748B]">This invite link is no longer valid. If you already created an account, sign in.</p>
			{#if form?.message}<p class="mt-4 text-sm text-red-600">{form.message}</p>{/if}
			<p class="mt-6 text-sm text-[#64748B]">
				<a class="font-semibold text-brand" href="/doctors/login">Doctor sign in</a>
			</p>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">
				{preview.name} invited you to careOS{#if preview.specialty}, {preview.specialty}{/if}. This link opens your clinic account.
			</p>
			{#if data.signedIn}
				<p class="mt-6 text-sm text-red-600">Sign out of the current account, then open this link again.</p>
				<form class="mt-4" method="POST" action="/logout">
					<button class="btn" type="submit">Sign out</button>
				</form>
			{:else}
				<form method="POST" class="mt-8 space-y-3">
					<label class="block text-sm font-semibold" for="name">Name</label>
					<input class="field" id="name" name="name" autocomplete="name" required maxlength="80" value={form?.name ?? ''} placeholder="Dr. Ada Lovelace" />
					<label class="block text-sm font-semibold" for="credentials">Credentials</label>
					<input class="field" id="credentials" name="credentials" required maxlength="40" value={form?.credentials ?? ''} placeholder="MD, FACC" />
					<label class="block text-sm font-semibold" for="specialty">Specialty</label>
					<input class="field" id="specialty" name="specialty" required maxlength="80" value={form?.specialty ?? ''} />
					<label class="block text-sm font-semibold" for="gender">Gender</label>
					<select class="field" id="gender" name="gender" required>
						<option value="" disabled selected={form?.gender !== 'Female' && form?.gender !== 'Male'}>Choose</option>
						<option value="Female" selected={form?.gender === 'Female'}>Female</option>
						<option value="Male" selected={form?.gender === 'Male'}>Male</option>
					</select>
					<label class="block text-sm font-semibold" for="practice">Practice</label>
					<input class="field" id="practice" name="practice" required maxlength="160" value={form?.practice ?? preview.practice} />
					<label class="block text-sm font-semibold" for="location">Location</label>
					<input class="field" id="location" name="location" required maxlength="160" value={form?.location ?? preview.location} />
					<label class="block text-sm font-semibold" for="phone">Phone</label>
					<input class="field" id="phone" name="phone" type="tel" autocomplete="tel" maxlength="40" value={form?.phone ?? ''} />
					<label class="block text-sm font-semibold" for="email">Email</label>
					<input class="field" id="email" name="email" type="email" autocomplete="email" required maxlength="120" value={form?.email ?? ''} />
					<label class="block text-sm font-semibold" for="password">Password</label>
					<input class="field" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
					{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
					<button class="btn btn-block" type="submit">Create account</button>
				</form>
			{/if}
			<p class="mt-6 text-sm text-[#64748B]">
				Already have a clinic account? <a class="font-semibold text-brand" href="/doctors/login">Sign in</a>
			</p>
		{/if}
	</div>
</main>
