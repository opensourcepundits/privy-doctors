<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate, liveDay } from '#lib/format';
	import { priorityClass, priorityOf } from '#lib/priority';

	type Task = {
		id: number;
		consultation_id: number;
		consultation_code: string;
		consultation_uid?: string | null;
		uid?: string | null;
		order_uid?: string | null;
		order_kind?: string | null;
		vaccination_id?: number | null;
		has_proof?: boolean | null;
		doctor_name: string;
		started_at: Date | string;
		title: string;
		detail: string | null;
		note: string | null;
		status: string;
		stored_name: string | null;
		file_name: string | null;
	};

	let {
		tasks,
		upload = false,
		vaccinate = false,
		message = ''
	}: {
		tasks: Task[];
		upload?: boolean;
		vaccinate?: boolean;
		message?: string;
	} = $props();

	let chosen = $state<Record<number, string>>({});
	let sending = $state<number | null>(null);

	function remember(id: number, input: HTMLInputElement) {
		chosen[id] = input.files?.[0]?.name ?? '';
	}

	function uploaded(id: number): SubmitFunction {
		return () => {
			sending = id;
			return async ({ result, update }) => {
				sending = null;
				if (result.type === 'success') delete chosen[id];
				await update();
			};
		};
	}

	const groups = $derived.by(() => {
		const rows: {
			consultation_id: number;
			code: string;
			uid: string | null;
			doctor_name: string;
			started_at: Date | string;
			tasks: Task[];
		}[] = [];
		for (const task of tasks) {
			const last = rows.at(-1);
			if (last?.consultation_id === task.consultation_id) last.tasks.push(task);
			else {
				rows.push({
					consultation_id: task.consultation_id,
					code: task.consultation_code,
					uid: task.consultation_uid ?? null,
					doctor_name: task.doctor_name,
					started_at: task.started_at,
					tasks: [task]
				});
			}
		}
		return rows;
	});
</script>

{#if message}
	<p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
{/if}

{#if groups.length}
	<div class="space-y-3">
		{#each groups as group (group.consultation_id)}
			<article class="card">
				<p class="kicker">Consultation {group.uid ?? group.code}</p>
				<p class="mt-1 text-sm text-[#64748B]">
					<Mention text={group.doctor_name} /> · {formatDate(group.started_at)}
				</p>
				<ul class="mt-3 space-y-4">
					{#each group.tasks as task (task.id)}
						{@const vaccine = task.order_kind === 'vaccine'}
						{@const done = vaccine ? task.status === 'received' : Boolean(task.stored_name)}
						<li class="flex gap-3">
							<span
								class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border {done
									? 'border-emerald-600 bg-emerald-600 text-white'
									: 'border-[#CBD5E1]'}"
								aria-hidden="true"
							>
								{#if done}
									<span class="material-symbols-outlined text-[14px]">check</span>
								{/if}
							</span>
							<div class="min-w-0 flex-1">
								<p class="font-semibold">{task.title}</p>
								{#if task.uid || task.order_uid}
									<p class="text-xs text-[#64748B]">{task.uid ? `Task ${task.uid}` : ''}{task.uid && task.order_uid ? ' · ' : ''}{task.order_uid ? `Order ${task.order_uid}` : ''}</p>
								{/if}
								{#if priorityOf(task.detail)}
									<span class="mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold {priorityClass(task.detail)}">{priorityOf(task.detail)}</span>
								{:else if task.detail}
									<p class="text-sm text-brand">{task.detail}</p>
								{/if}
								{#if task.note}<p class="text-sm text-[#64748B]">{task.note}</p>{/if}
								{#if vaccine && done}
									<p class="mt-1 text-sm text-emerald-700">Recorded on the vaccination card</p>
									{#if task.has_proof && task.vaccination_id}
										<a class="mt-2 block overflow-hidden rounded-xl border border-[#E2E8F0]" href="/files/vaccinations/{task.vaccination_id}" target="_blank" rel="noreferrer">
											<img class="max-h-64 w-full bg-white object-contain" src="/files/vaccinations/{task.vaccination_id}" alt="Proof for {task.title}" />
										</a>
									{:else}
										<p class="mt-1 text-sm text-[#64748B]">No photo was attached.</p>
									{/if}
									{#if vaccinate}
										<a class="btn mt-3" href="/patient/vaccinations">View on your vaccination card</a>
									{/if}
								{:else if vaccine && vaccinate}
									<form class="mt-2 space-y-2" method="POST" action="?/vaccination" enctype="multipart/form-data">
										<input type="hidden" name="task" value={task.id} />
										<label class="block text-sm font-semibold" for="given-{task.id}">
											Date given
											<input class="field mt-1" id="given-{task.id}" name="given_on" type="date" required max={liveDay()} />
										</label>
										<p class="text-sm font-semibold">
											Photo of the record
											<span class="font-normal text-[#64748B]">optional</span>
										</p>
										<label class="btn" for="proof-{task.id}">Choose file</label>
										<input
											class="sr-only"
											id="proof-{task.id}"
											name="proof"
											type="file"
											accept="image/jpeg,image/png,image/gif,image/webp"
											onchange={(event) => remember(task.id, event.currentTarget)}
										/>
										{#if chosen[task.id]}<p class="text-xs text-[#64748B]">{chosen[task.id]}</p>{/if}
										<button class="btn" type="submit">Record on my vaccination card</button>
									</form>
								{:else if vaccine}
									<p class="mt-1 text-sm text-[#64748B]">Waiting for the patient to record this vaccination.</p>
								{:else if task.stored_name}
									<p class="mt-1 text-sm text-emerald-700">Result received{task.file_name ? ` · ${task.file_name}` : ''}</p>
									<iframe class="mt-2 h-72 w-full rounded-xl border border-[#E2E8F0] bg-white" title="{task.title} result" src="/files/tasks/{task.id}"></iframe>
									<a class="btn mt-3" href="/files/tasks/{task.id}?download">Download PDF</a>
									{#if upload}
										<form class="mt-3 space-y-2" method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={uploaded(task.id)}>
											<input type="hidden" name="task" value={task.id} />
											<label class="btn" for="replace-{task.id}">Replace the PDF</label>
											<input class="sr-only" id="replace-{task.id}" name="result" type="file" accept="application/pdf,.pdf" required onchange={(event) => remember(task.id, event.currentTarget)} />
											{#if chosen[task.id]}
												<p class="text-xs text-[#64748B]">{chosen[task.id]}</p>
												<button class="btn" type="submit" disabled={sending === task.id}>{sending === task.id ? 'Uploading…' : 'Upload replacement'}</button>
											{/if}
										</form>
									{/if}
								{:else if upload}
									<form class="mt-2 space-y-2" method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={uploaded(task.id)}>
										<input type="hidden" name="task" value={task.id} />
										<label class="btn" for="result-{task.id}">{chosen[task.id] ? 'Choose a different PDF' : 'Upload the result PDF'}</label>
										<input class="sr-only" id="result-{task.id}" name="result" type="file" accept="application/pdf,.pdf" required onchange={(event) => remember(task.id, event.currentTarget)} />
										{#if chosen[task.id]}
											<p class="text-xs text-[#64748B]">{chosen[task.id]}</p>
											<button class="btn" type="submit" disabled={sending === task.id}>{sending === task.id ? 'Saving…' : 'Mark done and save PDF'}</button>
										{/if}
									</form>
								{:else}
									<p class="mt-1 text-sm text-[#64748B]">Waiting for the patient to upload the PDF.</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</article>
		{/each}
	</div>
{:else}
	<p class="card text-sm text-[#64748B]">No tests or vaccinations are on this checklist yet.</p>
{/if}
