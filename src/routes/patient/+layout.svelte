<script lang="ts">
	import Frame from '#lib/components/Frame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const nav = [
		{ href: '/patient', label: 'Home', icon: 'home' },
		{ href: '/patient/book', label: 'Book', icon: 'calendar_month' },
		{ href: '/patient/prescriptions', label: 'Prescriptions', icon: 'medication' },
		{ href: '/patient/history', label: 'History', icon: 'clinical_notes' },
		{ href: '/patient/billing', label: 'Billing', icon: 'receipt_long' },
		{ href: '/patient/profile', label: 'Profile', icon: 'person' }
	];
</script>

<Frame
	scheme="patient"
	path={data.path}
	query={data.query}
	notice={data.notice}
	{nav}
	who="{data.patient.first_name} {data.patient.last_name}"
	role="Patient portal"
>
	{#if data.preview}
		<p class="mx-4 mt-4 rounded-xl bg-[#0F172A] px-3 py-2 text-sm text-white lg:mx-0">
			Viewing the patient portal as Eleanor Vance. <a class="underline" href="/doctor">Return to the clinic</a>
		</p>
	{/if}
	{@render children()}
</Frame>
