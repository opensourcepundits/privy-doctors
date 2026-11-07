<script lang="ts">
	import { formatDate, isoDate, restDays } from '#lib/format';
	import type { CertificateDocument } from '#lib/server/clinic';

	let { certificate, backHref, backLabel }: { certificate: CertificateDocument; backHref: string; backLabel: string } = $props();

	const days = $derived(restDays(isoDate(certificate.rest_from), isoDate(certificate.rest_until)));
	const patientName = $derived(`${certificate.first_name} ${certificate.last_name}`.trim());
	const clinician = $derived(
		certificate.credentials ? `${certificate.doctor_name}, ${certificate.credentials}` : certificate.doctor_name
	);
	const identity = $derived(
		[
			certificate.pid,
			certificate.dob ? `DOB ${formatDate(certificate.dob)}` : '',
			certificate.sex,
			certificate.nic ? `NIC ${certificate.nic}` : '',
			certificate.passport ? `Passport ${certificate.passport}` : ''
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<header class="certificate-chrome px-4 pt-5 lg:px-0">
	<a class="inline-flex items-center gap-1 text-sm font-semibold text-brand" href={backHref}>
		<span class="material-symbols-outlined text-base">arrow_back</span>
		{backLabel}
	</a>
</header>

<section class="px-4 py-4 lg:px-0">
	<article class="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
		<div class="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
			<div>
				<p class="text-xs font-semibold tracking-wide text-brand uppercase">{certificate.practice}</p>
				<h1 class="display mt-1 text-2xl font-bold">Medical certificate</h1>
				<p class="mt-1 text-sm text-[#64748B]">{certificate.location}</p>
			</div>
			<div class="text-right">
				<p class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">Certificate</p>
				<p class="text-sm font-bold">{certificate.code || 'Pending issue'}</p>
				{#if certificate.consult_code}
					<p class="text-[11px] text-[#64748B]">Visit {certificate.consult_code}</p>
				{/if}
			</div>
		</div>

		<p class="mt-5 text-sm leading-6">
			This is to certify that <span class="font-semibold">{patientName}</span> was examined at {certificate.practice}
			and is certified for rest from duties for the period stated below.
		</p>
		<p class="mt-1 text-xs text-[#64748B]">{identity}</p>

		<dl class="mt-5 space-y-3 text-sm">
			<div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
				<dt class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">Reason</dt>
				<dd class="mt-1 whitespace-pre-wrap">{certificate.reason}</dd>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
					<dt class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">Certified rest</dt>
					<dd class="mt-1 font-semibold">
						{formatDate(certificate.rest_from)} – {formatDate(certificate.rest_until)}
					</dd>
					{#if days}
						<dd class="text-xs text-[#64748B]">{days} {days === 1 ? 'day' : 'days'}, including both dates</dd>
					{/if}
				</div>
				<div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
					<dt class="text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">Certificate date</dt>
					<dd class="mt-1 font-semibold">{formatDate(certificate.issued_on)}</dd>
				</div>
			</div>
		</dl>

		<div class="mt-8 border-t border-[#E2E8F0] pt-4">
			<p class="text-[11px] font-semibold tracking-wide text-brand uppercase">Electronically signed</p>
			<p class="mt-1 font-semibold">{clinician}</p>
			<p class="text-sm text-[#64748B]">{[certificate.specialty, certificate.practice].filter(Boolean).join(' · ')}</p>
			{#if certificate.npi || certificate.phone}
				<p class="text-xs text-[#64748B]">{[certificate.npi ? `NPI ${certificate.npi}` : '', certificate.phone].filter(Boolean).join(' · ')}</p>
			{/if}
		</div>
	</article>

	<button class="certificate-chrome btn mx-auto mt-4 flex" type="button" onclick={() => window.print()}>
		<span class="material-symbols-outlined text-[18px]">print</span>
		Print certificate
	</button>
</section>

<style>
	@media print {
		:global(aside),
		:global(nav),
		:global(.sticky) {
			display: none !important;
		}
		.certificate-chrome {
			display: none !important;
		}
	}
</style>
