<script lang="ts">
	import { getContext } from 'svelte';
	import { liveCopy } from '#lib/format';
	import { splitMentions, type MentionContext } from '#lib/mentions';

	let { text = '' }: { text?: string | null } = $props();
	const mentions = getContext<MentionContext>('mentions');
	const parts = $derived(splitMentions(liveCopy(text ?? ''), mentions?.doctors ?? []));

	function href(id: number) {
		if (!mentions || mentions.portal === 'patient') return `/patient/doctors/${id}`;
		if (mentions.selfId === id) return '/doctor/profile';
		return `/doctor/doctors/${id}`;
	}
</script>

{#if mentions}
	{#each parts as part}
		{#if part.id}
			<a class="pointer-events-auto relative z-10 font-semibold text-brand underline decoration-brand/30 underline-offset-2" href={href(part.id)}>{part.text}</a>
		{:else}{part.text}{/if}
	{/each}
{:else}
	{liveCopy(text ?? '')}
{/if}
