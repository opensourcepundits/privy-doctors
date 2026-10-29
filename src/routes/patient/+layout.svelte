<script lang="ts">
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import Frame from '#lib/components/Frame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	setContext('mentions', {
		get doctors() {
			return data.directory;
		},
		portal: 'patient' as const,
		selfId: null
	});
	const path = $derived(page.url.pathname);
	const query = $derived(page.url.search);
	const notice = $derived(page.url.searchParams.get('notice'));
	const nav = [
		{ href: '/patient', label: 'Home', icon: 'home' },
		{ href: '/patient/book', label: 'Book', icon: 'calendar_month' },
		{ href: '/patient/tasks', label: 'To do', icon: 'checklist' },
		{ href: '/patient/history', label: 'History', icon: 'clinical_notes' },
		{ href: '/patient/profile', label: 'Profile', icon: 'person' }
	];
</script>

<Frame
	scheme="patient"
	{path}
	{query}
	{notice}
	{nav}
	who="{data.patient.first_name} {data.patient.last_name}"
	role="Patient portal"
	notifications={data.notifications}
	markSeen={data.preview ? '' : '/patient/notifications?/seen'}
>
	{#if data.preview}
		<p class="mx-4 mt-4 rounded-xl bg-[#0F172A] px-3 py-2 text-sm text-white lg:mx-0">
			Viewing the patient portal as {data.patient.first_name} {data.patient.last_name}. <a class="underline" href="/doctor">Return to the clinic</a>
		</p>
	{/if}
	{@render children()}
</Frame>
