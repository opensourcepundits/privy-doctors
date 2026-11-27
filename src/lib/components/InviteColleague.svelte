<script lang="ts">
	let { name, class: className = '' }: { name: string; class?: string } = $props();

	let open = $state(false);
	let busy = $state(false);
	let link = $state('');
	let message = $state('');
	let copied = $state<'message' | 'link' | ''>('');
	let errorMessage = $state('');
	let canShare = $state(false);
	let messageEl = $state<HTMLTextAreaElement | null>(null);

	function draft(colleague: string, href: string) {
		return `${colleague} invited you to careOS.\n\nJoin as a colleague with this link:\n${href}`;
	}

	function outgoing() {
		const text = message.trim();
		if (!link || text.includes(link)) return text;
		return `${text}\n\n${link}`.trim();
	}

	$effect(() => {
		canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	$effect(() => {
		if (!open) return;
		messageEl?.focus();
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') open = false;
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	async function load(rotate = false) {
		if (busy) return;
		busy = true;
		errorMessage = '';
		copied = '';
		try {
			const body = new FormData();
			if (rotate) body.set('rotate', '1');
			const response = await fetch('/doctor/invite', { method: 'POST', body });
			const payload = (await response.json().catch(() => null)) as { link?: string; message?: string } | null;
			if (!response.ok || !payload?.link) {
				errorMessage = payload?.message || 'The invite could not be prepared.';
				return;
			}
			const next = payload.link;
			const previous = link;
			if (previous && message.includes(previous)) message = message.replaceAll(previous, next);
			else if (!message || message === draft(name, previous)) message = draft(name, next);
			else message = `${message.trim()}\n\n${next}`;
			link = next;
			open = true;
		} catch {
			errorMessage = 'The invite could not be prepared.';
		} finally {
			busy = false;
		}
	}

	async function copy(value: string, kind: 'message' | 'link') {
		errorMessage = '';
		try {
			await navigator.clipboard.writeText(value);
			copied = kind;
			return;
		} catch {
			const area = document.createElement('textarea');
			area.value = value;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.left = '-9999px';
			document.body.append(area);
			area.select();
			const ok = document.execCommand('copy');
			area.remove();
			if (ok) {
				copied = kind;
				return;
			}
		}
		copied = '';
		if (kind === 'message') messageEl?.select();
		errorMessage = 'Select the message and copy it from there.';
	}

	async function share() {
		const text = outgoing();
		errorMessage = '';
		if (!canShare) {
			await copy(text, 'message');
			return;
		}
		try {
			await navigator.share({ title: 'Join careOS', text });
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			await copy(text, 'message');
		}
	}

	function openChannel(href: string) {
		if (href.startsWith('http')) {
			window.open(href, '_blank', 'noopener,noreferrer');
			return;
		}
		window.location.href = href;
	}

	function select(event: FocusEvent) {
		if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select();
	}
</script>

<div class={className}>
	<button class="btn-line" type="button" aria-haspopup="dialog" aria-expanded={open} disabled={busy} onclick={() => load(false)}>
		<span class="material-symbols-outlined text-lg">{busy && !open ? 'progress_activity' : 'person_add'}</span>
		Invite a Colleague
	</button>
	{#if errorMessage && !open}
		<p class="mt-2 text-sm text-red-600">{errorMessage}</p>
	{/if}
	{#if open}
		<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
			<button class="absolute inset-0 bg-[#0F172A]/40" type="button" aria-label="Close invite" onclick={() => (open = false)}></button>
			<div
				class="relative z-10 max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl"
				role="dialog"
				tabindex="-1"
				aria-modal="true"
				aria-labelledby="invite-colleague-title"
			>
				<p class="kicker">Colleague</p>
				<h2 id="invite-colleague-title" class="display mt-1 text-xl font-bold">Invite a Colleague</h2>
				<p class="mt-1 text-sm text-[#64748B]">
					This message is ready to send. The link opens a colleague account directly and works once.
				</p>
				<label class="mt-4 block text-sm font-semibold" for="invite-message">
					Message
					<textarea class="field mt-1" id="invite-message" bind:this={messageEl} bind:value={message}></textarea>
				</label>
				<label class="mt-3 block text-sm font-semibold" for="invite-link">
					Direct link
					<input class="field mt-1" id="invite-link" readonly value={link} aria-label="Direct invite link" onfocus={select} />
				</label>
				<div class="mt-3 grid gap-2 {canShare ? 'sm:grid-cols-2' : ''}">
					{#if canShare}
						<button class="btn" type="button" onclick={share}>
							<span class="material-symbols-outlined text-lg">ios_share</span>
							Share message
						</button>
					{/if}
					<button class={canShare ? 'btn-line' : 'btn'} type="button" onclick={() => copy(outgoing(), 'message')}>
						<span class="material-symbols-outlined text-lg">{copied === 'message' ? 'check' : 'content_copy'}</span>
						{copied === 'message' ? 'Message copied' : 'Copy message'}
					</button>
				</div>
				<div class="mt-2 flex flex-wrap gap-2">
					<button class="btn-sm" type="button" onclick={() => copy(link, 'link')}>
						{copied === 'link' ? 'Link copied' : 'Copy link'}
					</button>
					<button class="btn-sm" type="button" onclick={() => openChannel(`https://wa.me/?text=${encodeURIComponent(outgoing())}`)}>
						WhatsApp
					</button>
					<button
						class="btn-sm"
						type="button"
						onclick={() => openChannel(`mailto:?subject=${encodeURIComponent(`${name} invited you to careOS`)}&body=${encodeURIComponent(outgoing())}`)}
					>
						Email
					</button>
					<button class="btn-sm" type="button" onclick={() => openChannel(`sms:?body=${encodeURIComponent(outgoing())}`)}>
						Text message
					</button>
				</div>
				{#if errorMessage}
					<p class="mt-3 text-sm text-red-600">{errorMessage}</p>
				{/if}
				<div class="mt-4 border-t border-[#E2E8F0] pt-3">
					<button class="text-sm font-semibold text-brand" type="button" disabled={busy} onclick={() => load(true)}>
						{busy ? 'Preparing a new link…' : 'Generate a new link'}
					</button>
					<p class="mt-1 text-xs text-[#64748B]">
						A new link replaces this one. A link you already sent will stop working.
					</p>
				</div>
				<button class="btn-line mt-4" type="button" onclick={() => (open = false)}>Close</button>
			</div>
		</div>
	{/if}
</div>
