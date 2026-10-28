<script lang="ts">
	import { formatDate, formatTime } from '#lib/format';

	let {
		requests,
		preview = false
	}: {
		requests: { id: number; created_at: Date | string; name: string; credentials: string; specialty: string }[];
		preview?: boolean;
	} = $props();
</script>

{#each requests as request}
	<article class="card">
		<p class="kicker">Record access</p>
		<p class="mt-1 font-semibold">{request.name}{request.credentials ? `, ${request.credentials}` : ''}</p>
		<p class="text-sm text-[#64748B]">{request.specialty}</p>
		<p class="mt-2 text-sm">Wants to open your full medical history.</p>
		<p class="mt-1 text-xs text-[#64748B]">{formatDate(request.created_at)} · {formatTime(request.created_at)}</p>
		{#if !preview}
			<div class="mt-3 grid grid-cols-2 gap-2">
				<form method="POST" action="?/allow">
					<input type="hidden" name="id" value={request.id} />
					<button class="btn" type="submit">Allow</button>
				</form>
				<form method="POST" action="?/deny">
					<input type="hidden" name="id" value={request.id} />
					<button class="btn-line" type="submit">Deny</button>
				</form>
			</div>
		{/if}
	</article>
{/each}
