<script lang="ts">
	import Mention from '#lib/components/Mention.svelte';
	import { formatDate } from '#lib/format';

	type Task = {
		id: number;
		consultation_id: number;
		consultation_code: string;
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
		message = ''
	}: {
		tasks: Task[];
		upload?: boolean;
		message?: string;
	} = $props();

	const groups = $derived.by(() => {
		const rows: {
			consultation_id: number;
			code: string;
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
		{#each groups as group}
			<article class="card">
				<p class="kicker">Consultation {group.code}</p>
				<p class="mt-1 text-sm text-[#64748B]">
					<Mention text={group.doctor_name} /> · {formatDate(group.started_at)}
				</p>
				<ul class="mt-3 space-y-4">
					{#each group.tasks as task}
						<li class="flex gap-3">
							<span
								class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border {task.stored_name
									? 'border-emerald-600 bg-emerald-600 text-white'
									: 'border-[#CBD5E1]'}"
								aria-hidden="true"
							>
								{#if task.stored_name}
									<span class="material-symbols-outlined text-[14px]">check</span>
								{/if}
							</span>
							<div class="min-w-0 flex-1">
								<p class="font-semibold">{task.title}</p>
								{#if task.detail}<p class="text-sm text-brand">{task.detail}</p>{/if}
								{#if task.note}<p class="text-sm text-[#64748B]">{task.note}</p>{/if}
								{#if task.stored_name}
									<p class="mt-1 text-sm text-emerald-700">Result received{task.file_name ? ` · ${task.file_name}` : ''}</p>
									<iframe class="mt-2 h-72 w-full rounded-xl border border-[#E2E8F0] bg-white" title="{task.title} result" src="/files/tasks/{task.id}"></iframe>
									<a class="mt-2 inline-flex text-sm font-semibold text-brand" href="/files/tasks/{task.id}?download">Download PDF</a>
									{#if upload}
										<form class="mt-3 space-y-2" method="POST" action="?/upload" enctype="multipart/form-data">
											<input type="hidden" name="task" value={task.id} />
											<label class="block text-sm font-semibold" for="replace-{task.id}">
												Replace the PDF
												<input class="mt-1 block w-full text-sm" id="replace-{task.id}" name="result" type="file" accept="application/pdf,.pdf" required />
											</label>
											<button class="btn" type="submit">Upload replacement</button>
										</form>
									{/if}
								{:else if upload}
									<form class="mt-2 space-y-2" method="POST" action="?/upload" enctype="multipart/form-data">
										<input type="hidden" name="task" value={task.id} />
										<label class="block text-sm font-semibold" for="result-{task.id}">
											Upload the result PDF
											<input class="mt-1 block w-full text-sm" id="result-{task.id}" name="result" type="file" accept="application/pdf,.pdf" required />
										</label>
										<button class="btn" type="submit">Mark done and save PDF</button>
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
	<p class="card text-sm text-[#64748B]">No consultation has added tests to this checklist yet.</p>
{/if}
