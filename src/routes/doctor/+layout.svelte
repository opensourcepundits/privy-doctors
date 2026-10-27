<script lang="ts">
	import Frame from '#lib/components/Frame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const nav = [
		{ href: '/doctor', label: 'Home', icon: 'home' },
		{ href: '/doctor/search', label: 'Search', icon: 'search' },
		{ href: '/doctor/search?intent=consult', label: 'Consult', icon: 'add', fab: true },
		{ href: '/doctor/analytics', label: 'Data', icon: 'monitoring' },
		{ href: '/doctor/profile', label: 'Profile', icon: 'person' }
	];
</script>

<Frame scheme="doctor" path={data.path} query={data.query} notice={data.notice} {nav} who={data.doctor.name} role={data.doctor.specialty}>
	{@render children()}
</Frame>
