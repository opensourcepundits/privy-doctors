<script lang="ts">
	import { onMount, tick } from 'svelte';
	import jsQR from 'jsqr';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let stage = $state<HTMLDivElement | null>(null);
	let video = $state<HTMLVideoElement | null>(null);
	let formEl = $state<HTMLFormElement | null>(null);
	let scanning = $state(false);
	let shown = $state(false);
	let opening = $state(false);
	let cameraError = $state('');
	let payload = $state('');
	let stream: MediaStream | null = null;
	let scanCanvas: HTMLCanvasElement | null = null;
	let timer = 0;
	let sent = false;
	let lastRead = '';

	type CodeDetector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]> };

	function stopCamera() {
		window.clearTimeout(timer);
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
		if (video) video.srcObject = null;
		scanning = false;
		shown = false;
		lastRead = '';
		stage?.classList.add('scan-idle');
	}

	function phoneSecureUrl() {
		if (window.isSecureContext) return '';
		const port = Number(location.port || '80');
		return `https://${location.hostname}:${port + 1}${location.pathname}${location.search}${location.hash}`;
	}

	function cameraMessage(error: unknown) {
		const name = error instanceof DOMException ? error.name : '';
		if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
			return 'Camera permission was blocked. Allow the camera for this site, then start scanning again.';
		}
		if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
			return 'No camera was found. Type the access code instead.';
		}
		return 'The camera did not open. Allow camera access, then try again.';
	}

	async function openCamera() {
		if (scanning || sent) return;
		const secure = phoneSecureUrl();
		if (secure) {
			location.assign(secure);
			return;
		}
		cameraError = '';
		if (!video || !navigator.mediaDevices?.getUserMedia) {
			cameraError = cameraMessage(new Error('missing'));
			return;
		}
		let next: MediaStream;
		try {
			next = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: { facingMode: { ideal: 'environment' } }
			});
		} catch (error) {
			const name = error instanceof DOMException ? error.name : '';
			if (name !== 'OverconstrainedError') {
				cameraError = cameraMessage(error);
				return;
			}
			try {
				next = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
			} catch (again) {
				cameraError = cameraMessage(again);
				return;
			}
		}

		stream = next;
		stage?.classList.remove('scan-idle');
		shown = true;
		video.muted = true;
		video.playsInline = true;
		video.srcObject = stream;
		try {
			await video.play();
		} catch {
			stopCamera();
			cameraError = 'The camera did not start. Allow camera access, then try again.';
			return;
		}
		scanning = true;

		const Detector = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => CodeDetector }).BarcodeDetector;
		let detector: CodeDetector | null = null;
		if (Detector) {
			try {
				detector = new Detector({ formats: ['qr_code'] });
			} catch {
				detector = null;
			}
		}
		timer = window.setTimeout(() => void watch(detector), 200);
	}

	async function watch(detector: CodeDetector | null) {
		if (!scanning || !video || sent) return;
		const value = await readCode(detector);
		if (value && value === lastRead) {
			void submitPayload(value);
			return;
		}
		lastRead = value;
		timer = window.setTimeout(() => void watch(detector), 200);
	}

	async function readCode(detector: CodeDetector | null) {
		if (!video || video.readyState < 2 || video.videoWidth < 2) return '';
		if (detector) {
			try {
				const codes = await detector.detect(video);
				const value = codes[0]?.rawValue?.trim();
				if (value) return value;
			} catch {
				/* The frame was not ready, or this detector cannot read it. */
			}
		}
		const scale = Math.min(1, 720 / video.videoWidth);
		const width = Math.max(1, Math.floor(video.videoWidth * scale));
		const height = Math.max(1, Math.floor(video.videoHeight * scale));
		if (!scanCanvas) scanCanvas = document.createElement('canvas');
		scanCanvas.width = width;
		scanCanvas.height = height;
		const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return '';
		ctx.drawImage(video, 0, 0, width, height);
		const image = ctx.getImageData(0, 0, width, height);
		return jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })?.data.trim() ?? '';
	}

	async function submitPayload(value: string) {
		const next = value.trim();
		if (!next || sent) return;
		sent = true;
		opening = true;
		payload = next;
		stopCamera();
		await tick();
		formEl?.requestSubmit();
	}

	onMount(() => () => stopCamera());
</script>

<header class="px-4 pt-6 lg:px-0">
	<p class="kicker">Record access</p>
	<h1 class="display text-2xl font-bold lg:text-3xl">Scan a patient code</h1>
	<p class="mt-1 max-w-2xl text-sm text-[#64748B]">Point the camera at the QR code on the patient's profile. The chart opens as soon as the code is read. An access code works when the camera cannot.</p>
</header>

<section class="mx-4 max-w-xl py-4 lg:mx-0">
	{#if form?.message}
		<p class="mb-3 text-sm text-red-600">{form.message}</p>
	{/if}
	{#if cameraError}
		<p class="mb-3 text-sm text-[#64748B]">{cameraError}</p>
	{/if}

	<div bind:this={stage} class="scan-stage" class:scan-idle={!shown}>
		<video bind:this={video} class="aspect-[3/4] w-full rounded-2xl bg-black object-cover sm:aspect-video" autoplay muted playsinline></video>
		{#if scanning}
			<div class="scan-shade" aria-hidden="true"></div>
			<p class="scan-status">Hold the code in the frame</p>
		{/if}
	</div>

	{#if opening}
		<p class="mt-3 text-sm font-semibold text-brand">Opening the record…</p>
	{:else if scanning}
		<button class="btn-line mt-3" type="button" onclick={stopCamera}>Stop camera</button>
	{:else}
		<button class="btn" type="button" onclick={openCamera}>
			<span class="material-symbols-outlined text-lg">qr_code_scanner</span>
			Start scanning
		</button>
	{/if}

	<form class="card mt-4 space-y-3" method="POST" action="?/code">
		<label class="block text-sm font-semibold" for="access-code">
			Access code
			<input class="field mt-1 text-center font-mono text-lg tracking-widest uppercase" id="access-code" name="code" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX" />
		</label>
		<button class="btn" type="submit">Open the record</button>
	</form>

	<form bind:this={formEl} method="POST" action="?/scan">
		<input type="hidden" name="payload" value={payload} />
	</form>
</section>

<style>
	.scan-stage {
		position: relative;
	}

	.scan-stage.scan-idle {
		position: fixed;
		left: 0;
		top: 0;
		z-index: -1;
		width: min(100%, 36rem);
		opacity: 0;
		pointer-events: none;
	}

	.scan-shade {
		position: absolute;
		inset: 14%;
		border: 2px solid white;
		border-radius: 1rem;
		box-shadow: 0 0 0 999px rgba(15, 23, 42, 0.35);
	}

	.scan-status {
		position: absolute;
		right: 0.75rem;
		bottom: 0.75rem;
		left: 0.75rem;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.72);
		padding: 0.4rem 0.75rem;
		color: white;
		font-size: 0.8rem;
		font-weight: 650;
		text-align: center;
	}
</style>
