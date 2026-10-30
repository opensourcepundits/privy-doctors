<script lang="ts">
	let {
		title,
		image = null,
		report = null,
		caption = ''
	}: {
		title: string;
		image?: string | null;
		report?: string | null;
		caption?: string | null;
	} = $props();
</script>

{#if image || report}
	<div class="space-y-3">
		{#if image}
			<figure class="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#020617]">
				<img class="mx-auto max-h-[32rem] w-full object-contain" src={image} alt={title} />
				<figcaption class="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-300">
					<span>{caption || title}</span>
					<a class="btn-sm" href={image} download>Download image</a>
				</figcaption>
			</figure>
		{/if}
		{#if report}
			<iframe class="h-[28rem] w-full rounded-2xl border border-[#E2E8F0] bg-white" title="{title} report" src={report}></iframe>
			<a class="btn" href={report} target="_blank" rel="noreferrer">Open PDF report</a>
			<a class="btn-line" href={report} download>Download PDF</a>
		{/if}
	</div>
{/if}
