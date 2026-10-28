<script lang="ts">
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
	const waiting = $derived(data.incoming.filter((item) => item.status !== 'completed').length);
	const nav = $derived([
		{ href: '/doctor', label: 'Home', icon: 'home' },
		{ href: '/doctor/referrals', label: 'Referrals', icon: 'diversity_1', badge: waiting || undefined },
		{ href: '/doctor/search?intent=consult', label: 'Consult', icon: 'add', fab: true },
		{ href: '/doctor/analytics', label: 'Data', icon: 'monitoring' },
		{ href: '/doctor/profile', label: 'Profile', icon: 'person' }
	]);
</script>

<Frame scheme="doctor" path={data.path} query={data.query} notice={data.notice} {nav} who={data.doctor.name} role={data.doctor.specialty}>
	{@render children()}
</Frame>
