<script lang="ts">
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const preview = $derived(data.preview);
	const visits = $derived(
		!preview
			? ''
			: preview.consultations === 1
				? '1 consultation will be on your timeline, including any earlier visit recorded with this NIC or passport.'
				: preview.consultations > 1
					? `${preview.consultations} consultations will be on your timeline, including earlier visits recorded with this NIC or passport.`
					: 'Your clinic chart will be ready when you finish signing up.'
	);
</script>

<main class="scheme-patient flex min-h-dvh items-center justify-center bg-[#F3EEE6] px-4 py-10">
	<div class="w-full max-w-[480px] rounded-3xl border border-[#E2E8F0] bg-white px-6 py-8 shadow-xl lg:px-10 lg:py-10">
		<p class="kicker">Patient portal</p>
		<h1 class="display mt-2 text-3xl font-bold text-[#0F172A]">Finish your account</h1>
		{#if !preview}
			<p class="mt-2 text-sm text-[#64748B]">This link is no longer valid. If you already created an account, sign in.</p>
			<p class="mt-6 text-sm text-[#64748B]">
				<a class="font-semibold text-brand" href="/login">Sign in</a>
			</p>
		{:else}
			<p class="mt-2 text-sm text-[#64748B]">
				This chart is for {preview.firstName} {preview.lastName}{preview.dob ? `, born ${formatDate(preview.dob)}` : ''}. {visits}
			</p>
			{#if data.signedIn}
				<p class="mt-6 text-sm text-red-600">Sign out of the current account, then open this link again.</p>
			{:else}
				<form method="POST" class="mt-8 space-y-3">
					<label class="block text-sm font-semibold" for="email">Email</label>
					<input class="field" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
					<label class="block text-sm font-semibold" for="password">Password</label>
					<input class="field" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
					<label class="block text-sm font-semibold" for="nic">
						NIC
						<input class="field mt-1" id="nic" name="nic" autocomplete="off" value={form?.nic ?? preview.nic} required={Boolean(preview.nic)} />
					</label>
					<label class="block text-sm font-semibold" for="passport">
						Passport number
						<input class="field mt-1" id="passport" name="passport" autocomplete="off" value={form?.passport ?? preview.passport} required={Boolean(preview.passport)} />
					</label>
					<label class="block text-sm font-semibold" for="phone">Phone</label>
					<input class="field" id="phone" name="phone" type="tel" autocomplete="tel" value={form?.phone ?? preview.phone} />
					{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
					<button class="btn btn-block" type="submit">Create account</button>
				</form>
			{/if}
			<p class="mt-6 text-sm text-[#64748B]">
				Already finished this step? <a class="font-semibold text-brand" href="/login">Sign in</a>
			</p>
		{/if}
	</div>
</main>
