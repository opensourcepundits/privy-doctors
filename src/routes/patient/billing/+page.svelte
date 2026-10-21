<script lang="ts">
	import { formatDate, money } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const open = $derived(data.invoices.filter((invoice) => invoice.status !== 'paid'));
	const paid = $derived(data.invoices.filter((invoice) => invoice.status === 'paid'));
</script>

<header class="px-4 pt-5 lg:px-0">
	<p class="kicker">Financial and billing services</p>
	<h1 class="display text-2xl font-bold">Statements</h1>
	<p class="text-sm text-[#64748B]">Insurance is filed automatically. This is your direct responsibility.</p>
	<p class="display nums mt-3 text-3xl font-bold">{money(data.outstanding)}</p>
	<p class="text-sm">Total outstanding</p>
</header>

<section class="cards-2 px-4 py-4 lg:px-0">
	{#each open as invoice}
		<article class="card">
			<p class="font-semibold">{invoice.code}</p>
			<p>{invoice.title}</p>
			<p class="text-sm text-[#64748B]">{formatDate(invoice.issued_on)} · due {formatDate(invoice.due_on)}</p>
			<ul class="mt-2 space-y-1 text-sm">
				{#each invoice.lines as line}
					<li class="flex justify-between"><span>{line.description}</span><span class="nums">{money(line.amount)}</span></li>
				{/each}
			</ul>
			{#if invoice.insurance_note && !invoice.insurance_note.startsWith('Paid via')}
				<p class="mt-2 text-sm">{invoice.insurance_note}</p>
			{/if}
			<p class="font-semibold">Patient responsibility {money(invoice.patient_due)}</p>
		</article>
	{/each}
	<h2 class="display text-lg font-semibold">Past settled statements</h2>
	{#each paid as invoice}
		<article class="card">
			<p class="font-semibold">{invoice.code} · Paid</p>
			<p>{invoice.title}</p>
			<p class="text-sm text-[#64748B]">{formatDate(invoice.issued_on)}{#if invoice.insurance_note && !invoice.insurance_note.startsWith('Paid via')} · {invoice.insurance_note}{/if}</p>
			<p class="nums font-semibold">{money(invoice.patient_due)}</p>
		</article>
	{/each}
	<article class="card text-sm">
		<p class="font-semibold">{data.patient.insurance_name}</p>
		<p>Group {data.patient.insurance_group}</p>
		<p>Member {data.patient.insurance_member}</p>
		<a class="font-semibold text-[#0D7377]" href="/patient/help">Questions about a bill</a>
	</article>
</section>
