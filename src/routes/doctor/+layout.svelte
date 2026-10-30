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
		portal: 'doctor' as const,
		get selfId() {
			return data.doctor.id;
		}
	});
	const path = $derived(page.url.pathname);
	const query = $derived(page.url.search);
	const notice = $derived(page.url.searchParams.get('notice'));
	const sessions = $derived(
		data.openConsults.filter((item) => path !== `/doctor/patients/${item.pid}/consult`)
	);
	const nav = $derived([
		{ href: '/doctor', label: 'Home', icon: 'home' },
		{ href: '/doctor/history', label: 'History', icon: 'history' },
		{ href: '/doctor/search?intent=consult', label: 'Consult', icon: 'add', fab: true },
		{ href: '/doctor/analytics', label: 'Data', icon: 'monitoring' },
		{ href: '/doctor/profile', label: 'Profile', icon: 'person' }
	]);
</script>

<Frame
	scheme="doctor"
	{path}
	{query}
	{notice}
	{nav}
	who={data.doctor.name}
	role={data.doctor.specialty}
	notifications={data.notifications}
	markSeen="/doctor/notifications?/seen"
>
	{#each sessions as session}
		<div class="mx-4 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm lg:mx-0">
			<p class="min-w-0 flex-1">Consultation in progress with <span class="font-semibold">{session.first_name} {session.last_name}</span>.</p>
			<a class="btn-sm" href="/doctor/patients/{session.pid}/consult">Resume</a>
			<form method="POST" action="/doctor/session?/cancel" onsubmit={(event) => { if (!confirm(`Cancel the consultation with ${session.first_name} ${session.last_name}? Notes from this session will be discarded.`)) event.preventDefault(); }}>
				<input type="hidden" name="id" value={session.id} />
				<input type="hidden" name="return" value={path} />
				<button class="btn-sm-danger" type="submit">Cancel</button>
			</form>
		</div>
	{/each}
	{@render children()}
</Frame>
