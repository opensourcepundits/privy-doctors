<script lang="ts">
	let { link, name, class: className = '' }: { link: Promise<string | null>; name: string; class?: string } = $props();
	let copied = $state(false);

	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

{#await link then href}
	{#if href}
		<div class={className}>
		<article class="card max-w-3xl">
			<p class="kicker">No platform account</p>
			<h2 class="display mt-1 text-lg font-bold">Signup link</h2>
			<p class="mt-1 text-sm text-[#64748B]">
				{name} is not signed up. Copy this link and send it when you are ready. Consultations recorded under this NIC or passport stay on one timeline when they sign up.
			</p>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row">
				<input class="field" readonly value={href} aria-label="Signup link" onclick={(event) => { if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select(); }} />
				<button class="btn shrink-0" type="button" onclick={() => copy(href)}>
					<span class="material-symbols-outlined text-lg">{copied ? 'check' : 'content_copy'}</span>
					{copied ? 'Copied' : 'Copy link'}
				</button>
			</div>
		</article>
		</div>
	{/if}
{:catch}
	<p class="text-sm text-[#64748B]">The signup link could not be loaded.</p>
{/await}
