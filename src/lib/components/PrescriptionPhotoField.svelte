<script lang="ts">
	let { inputId = 'prescription-photo', selected = $bindable(false) }: { inputId?: string; selected?: boolean } = $props();
	let input = $state<HTMLInputElement | null>(null);
	let preview = $state('');
	let ready = $state(false);
	let note = $state('');

	function clearPreview() {
		if (preview) URL.revokeObjectURL(preview);
		preview = '';
	}

	function loadImage(url: string) {
		return new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('unreadable'));
			image.src = url;
		});
	}

	async function shrinkPhoto(file: File) {
		const url = URL.createObjectURL(file);
		try {
			const image = await loadImage(url);
			const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(image.width * scale));
			canvas.height = Math.max(1, Math.round(image.height * scale));
			const context = canvas.getContext('2d');
			if (!context) return null;
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
			if (!blob) return null;
			const base = file.name.replace(/\.[^.]+$/, '') || 'prescription';
			return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
		} catch {
			return null;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function chosen(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		clearPreview();
		ready = false;
		selected = false;
		note = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			target.value = '';
			note = 'Choose a JPEG, PNG, or WebP photo.';
			return;
		}
		selected = true;
		const shrunk = await shrinkPhoto(file);
		if (!shrunk) {
			target.value = '';
			selected = false;
			note = 'This photo could not be read. Choose a JPEG or PNG.';
			return;
		}
		const transfer = new DataTransfer();
		transfer.items.add(shrunk);
		target.files = transfer.files;
		preview = URL.createObjectURL(shrunk);
		ready = true;
	}

	function remove() {
		if (input) input.value = '';
		clearPreview();
		ready = false;
		selected = false;
		note = '';
	}
</script>

<form class="space-y-2" method="POST" action="?/photo" enctype="multipart/form-data">
	<div class="flex flex-wrap items-center gap-2">
		<label class="btn-sm" for={inputId}>Choose photo</label>
		<input class="sr-only" id={inputId} name="photo" type="file" accept="image/*" bind:this={input} onchange={chosen} />
		<button class="btn-sm" type="submit" disabled={!ready}>Upload photo</button>
	</div>
	{#if note}<p class="text-sm text-red-600">{note}</p>{/if}
	{#if preview}
		<div class="flex items-start justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
			<img class="max-h-48 rounded-lg border border-[#E2E8F0] bg-white object-contain" src={preview} alt="Chosen prescription photo, not yet saved" />
			<button class="grid h-8 w-8 place-items-center rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600" type="button" aria-label="Remove chosen photo" onclick={remove}>
				<span class="material-symbols-outlined text-[18px]">delete_outline</span>
			</button>
		</div>
	{/if}
</form>
