<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main class="flex min-h-dvh items-center justify-center bg-[#E7EEF6] px-4 py-10">
	<div class="w-full max-w-[480px] rounded-3xl border border-[#E2E8F0] bg-white px-6 py-8 shadow-xl lg:px-10 lg:py-10">
		<p class="kicker">Private practice</p>
		<h1 class="display mt-2 text-3xl font-bold text-[#0F172A]">careOS</h1>
		<p class="mt-2 text-sm text-[#64748B]">Clinic day of 17 November 2024. Sign in as the general practitioner, the patient, or the cardiologist used for referrals.</p>

		<form method="POST" class="mt-8 space-y-3">
			<label class="block text-sm font-semibold" for="email">Email</label>
			<input class="field" id="email" name="email" type="email" required value={form?.email ?? ''} />
			<label class="block text-sm font-semibold" for="password">Password</label>
			<input class="field" id="password" name="password" type="password" required value="clinic-demo" />
			{#if form?.message}<p class="text-sm text-red-600">{form.message}</p>{/if}
			<button class="btn btn-block" type="submit">Sign in</button>
		</form>

		<div class="mt-6 grid gap-3">
			<form method="POST">
				<input type="hidden" name="email" value="irfan.ameerudden@clinica.privata" />
				<input type="hidden" name="password" value="clinic-demo" />
				<button class="btn-line btn-block scheme-doctor" type="submit">Continue as Dr. Irfan Ameerudden</button>
			</form>
			<form method="POST">
				<input type="hidden" name="email" value="noor.yadallee@clinica.privata" />
				<input type="hidden" name="password" value="clinic-demo" />
				<button class="btn-line btn-block scheme-patient" type="submit">Continue as Noor Yadallee</button>
			</form>
			<form method="POST">
				<input type="hidden" name="email" value="sarah.jensen@clinica.privata" />
				<input type="hidden" name="password" value="clinic-demo" />
				<button class="btn-line btn-block scheme-doctor" type="submit">Continue as Dr. Sarah Jensen, cardiologist</button>
			</form>
		</div>
	</div>
</main>
