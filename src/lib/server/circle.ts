import { isoDate } from '#lib/format';
import { ensureChartCrypto, openPatientFile, presentChart, sealPatientFile, sealText } from './chart-crypto';
import { addSelfReport, decideChartAccess, encountersFor, pendingChartRequests } from './clinic';
import { client } from './db';
import { deleteCircleScan, deleteReportFile, readCircleScan, saveCircleScan, sniffDocument } from './uploads';

export type CirclePowers = {
	view_chart: boolean;
	accept_access: boolean;
	add_records: boolean;
};

export type CirclePerson = {
	id: number;
	pid: string;
	name: string;
	view_chart: boolean;
	accept_access: boolean;
	add_records: boolean;
};

const powers = ['view_chart', 'accept_access', 'add_records'] as const;

function flag(value: unknown) {
	return value === true || value === 't' || value === 'true';
}

async function personName(patientId: number) {
	const [row] = await client<{ first_name: string; last_name: string; pid: string; user_id: number | null }[]>`
		SELECT first_name, last_name, pid, user_id FROM patients WHERE id = ${patientId}
	`;
	if (!row) return null;
	const open = await presentChart(patientId, row);
	return {
		id: patientId,
		pid: open.pid,
		userId: open.user_id,
		name: `${open.first_name} ${open.last_name}`.trim()
	};
}

async function notifyPerson(userId: number | null, patientId: number, title: string, body: string) {
	if (!userId) return;
	await client`
		INSERT INTO notifications (user_id, patient_id, title, body, created_at)
		VALUES (
			${userId}, ${patientId},
			${await sealText(patientId, 'title', title)},
			${await sealText(patientId, 'body', body)},
			${new Date()}
		)
	`;
}

export async function circleLists(ownerId: number) {
	await ensureChartCrypto();
	const granted = await client<
		{ id: number; trustee_patient_id: number; view_chart: boolean; accept_access: boolean; add_records: boolean }[]
	>`
		SELECT id, trustee_patient_id, view_chart, accept_access, add_records
		FROM patient_trustees
		WHERE patient_id = ${ownerId}
		ORDER BY id
	`;
	const shared = await client<
		{ patient_id: number; view_chart: boolean; accept_access: boolean; add_records: boolean }[]
	>`
		SELECT patient_id, view_chart, accept_access, add_records
		FROM patient_trustees
		WHERE trustee_patient_id = ${ownerId}
		ORDER BY id
	`;
	const trustees: CirclePerson[] = [];
	for (const row of granted) {
		const person = await personName(row.trustee_patient_id);
		if (!person) continue;
		trustees.push({
			id: row.id,
			pid: person.pid,
			name: person.name,
			view_chart: flag(row.view_chart),
			accept_access: flag(row.accept_access),
			add_records: flag(row.add_records)
		});
	}
	const sharedWithMe: CirclePerson[] = [];
	for (const row of shared) {
		const person = await personName(row.patient_id);
		if (!person) continue;
		sharedWithMe.push({
			id: row.patient_id,
			pid: person.pid,
			name: person.name,
			view_chart: flag(row.view_chart),
			accept_access: flag(row.accept_access),
			add_records: flag(row.add_records)
		});
	}
	return { trustees, sharedWithMe };
}

export async function addTrustee(ownerId: number, query: string) {
	await ensureChartCrypto();
	const needle = query.trim();
	if (!needle) return { error: 'Enter a PID or an email address.' as const };
	const [match] = await client<{ id: number }[]>`
		SELECT p.id
		FROM patients p
		LEFT JOIN users u ON u.id = p.user_id AND u.role = 'patient'
		WHERE p.id <> ${ownerId}
		  AND (lower(p.pid) = lower(${needle}) OR lower(u.email) = lower(${needle}))
		LIMIT 1
	`;
	if (!match) return { error: 'No patient account matches that PID or email.' as const };
	const [existing] = await client<{ id: number }[]>`
		SELECT id FROM patient_trustees
		WHERE patient_id = ${ownerId} AND trustee_patient_id = ${match.id}
	`;
	if (existing) return { error: 'That person is already in your circle.' as const };
	await client`
		INSERT INTO patient_trustees (
			patient_id, trustee_patient_id, view_chart, accept_access, add_records, created_at
		) VALUES (${ownerId}, ${match.id}, true, false, false, ${new Date()})
	`;
	const [owner, trustee] = await Promise.all([personName(ownerId), personName(match.id)]);
	if (owner && trustee) {
		await notifyPerson(trustee.userId, match.id, 'Added to a circle', `${owner.name} added you to their circle.`);
	}
	return { saved: true as const };
}

export async function setTrusteePower(ownerId: number, trusteeRowId: number, power: string, allow: boolean) {
	if (!powers.includes(power as (typeof powers)[number])) return false;
	const column = power;
	const [row] = await client.unsafe<{ id: number }[]>(
		`UPDATE patient_trustees SET ${column} = $1 WHERE id = $2 AND patient_id = $3 RETURNING id`,
		[allow, trusteeRowId, ownerId]
	);
	return Boolean(row);
}

export async function removeTrustee(ownerId: number, trusteeRowId: number) {
	await client`
		DELETE FROM patient_trustees
		WHERE id = ${trusteeRowId} AND patient_id = ${ownerId}
	`;
}

export async function trusteeFor(actorId: number, pid: string) {
	await ensureChartCrypto();
	const [owner] = await client<{ id: number }[]>`SELECT id FROM patients WHERE lower(pid) = lower(${pid})`;
	if (!owner || owner.id === actorId) return null;
	const [row] = await client<CirclePowers[]>`
		SELECT view_chart, accept_access, add_records
		FROM patient_trustees
		WHERE patient_id = ${owner.id} AND trustee_patient_id = ${actorId}
	`;
	if (!row) return null;
	const person = await personName(owner.id);
	if (!person) return null;
	return {
		ownerId: owner.id,
		pid: person.pid,
		name: person.name,
		view_chart: flag(row.view_chart),
		accept_access: flag(row.accept_access),
		add_records: flag(row.add_records)
	};
}

export async function ownerRequests(actorId: number, pid: string) {
	const access = await trusteeFor(actorId, pid);
	if (!access?.accept_access) return null;
	return { access, requests: await pendingChartRequests(access.ownerId) };
}

export async function trusteeDecide(actorId: number, pid: string, requestId: number, allow: boolean) {
	const access = await trusteeFor(actorId, pid);
	if (!access?.accept_access) return { error: 'You cannot answer requests for this chart.' as const };
	const actor = await personName(actorId);
	const saved = await decideChartAccess(access.ownerId, requestId, allow, actor?.name || 'A trustee');
	if (!saved) return { error: 'That request is no longer waiting.' as const };
	return { saved: true as const };
}

export async function trusteeVisits(actorId: number, pid: string) {
	const access = await trusteeFor(actorId, pid);
	if (!access?.view_chart) return null;
	const rows = await encountersFor(access.ownerId);
	const visits = rows.map((row) => {
		const focus = typeof row.focus === 'string' && row.focus.trim() ? row.focus.trim() : 'Consultation';
		const when = row.occurred_on instanceof Date || typeof row.occurred_on === 'string' ? isoDate(row.occurred_on) : '';
		return { id: Number(row.id), label: [when, focus].filter(Boolean).join(' · ') };
	});
	return { access, visits };
}

function onDate(value: string) {
	const text = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
	if (text > isoDate(new Date())) return null;
	return text;
}

export async function addTrusteeTreatment(
	actorId: number,
	pid: string,
	input: { title: string; occurredOn: string; endedOn: string; ongoing: boolean; detail: string }
) {
	const access = await trusteeFor(actorId, pid);
	if (!access?.add_records) return { error: 'You cannot add records to this chart.' as const };
	const title = input.title.trim();
	if (!title || title.length > 120) return { error: 'Name the treatment in 120 characters or fewer.' as const };
	const occurredOn = onDate(input.occurredOn);
	if (!occurredOn) return { error: 'Enter the start date. It cannot be in the future.' as const };
	let endedOn = '';
	if (!input.ongoing) {
		endedOn = onDate(input.endedOn) ?? '';
		if (!endedOn) return { error: 'Enter the end date. It cannot be in the future.' as const };
		if (endedOn < occurredOn) return { error: 'End the treatment on or after the day it started.' as const };
	}
	const detail = input.detail.trim();
	if (detail.length > 1000) return { error: 'Keep the note to 1000 characters.' as const };
	await addSelfReport(access.ownerId, {
		kind: 'treatment',
		title,
		occurredOn,
		endedOn,
		location: '',
		detail,
		duration: '',
		severity: '',
		meds: '',
		ongoing: input.ongoing,
		addedBy: actorId
	});
	return { saved: true as const };
}

export async function addTrusteeScan(
	actorId: number,
	pid: string,
	input: { title: string; performedOn: string },
	file: { name: string; bytes: Buffer; type: string; ext: string }
) {
	const access = await trusteeFor(actorId, pid);
	if (!access?.add_records) return { error: 'You cannot add records to this chart.' as const };
	const title = input.title.trim();
	if (!title || title.length > 120) return { error: 'Name the scan in 120 characters or fewer.' as const };
	const performedOn = onDate(input.performedOn);
	if (!performedOn) return { error: 'Enter the date. It cannot be in the future.' as const };
	const image = file.ext !== 'pdf';
	const [row] = await client<{ id: number }[]>`
		INSERT INTO imaging_studies (
			patient_id, modality, title, performed_on, summary, vessels, status,
			image_path, report_path, added_by_patient_id, added_file_type
		) VALUES (
			${access.ownerId}, 'Scan', ${await sealText(access.ownerId, 'title', title)}, ${performedOn},
			${null},
			'[]'::jsonb, 'filed',
			${image ? 'pending' : null}, ${image ? null : 'pending'},
			${actorId}, ${file.type}
		)
		RETURNING id
	`;
	const href = `/files/scans/${row.id}`;
	try {
		await saveCircleScan(row.id, await sealPatientFile(access.ownerId, file.bytes));
		await client`
			UPDATE imaging_studies
			SET image_path = ${image ? href : null}, report_path = ${image ? null : href}
			WHERE id = ${row.id}
		`;
	} catch (error) {
		await client`DELETE FROM imaging_studies WHERE id = ${row.id}`;
		throw error;
	}
	return { saved: true as const };
}

export async function canReadAddedScan(actorId: number, patientId: number) {
	if (actorId === patientId) return true;
	const [owner] = await client<{ pid: string }[]>`SELECT pid FROM patients WHERE id = ${patientId}`;
	if (!owner) return false;
	const access = await trusteeFor(actorId, owner.pid);
	return Boolean(access?.view_chart);
}

export async function readAddedScan(id: number) {
	const [row] = await client<{ patient_id: number; added_by_patient_id: number | null; added_file_type: string | null; title: string }[]>`
		SELECT patient_id, added_by_patient_id, added_file_type, title
		FROM imaging_studies
		WHERE id = ${id} AND added_by_patient_id IS NOT NULL
	`;
	if (!row?.added_file_type) return null;
	const bytes = await openPatientFile(row.patient_id, await readCircleScan(id));
	if (!bytes) return null;
	const opened = await presentChart(row.patient_id, { title: row.title });
	return { patientId: row.patient_id, type: row.added_file_type, title: opened.title, bytes };
}

export async function addedRecords(ownerId: number) {
	const reports = await presentChart(
		ownerId,
		await client<{ id: number; title: string; occurred_on: Date | string; added_by_patient_id: number }[]>`
			SELECT id, title, occurred_on, added_by_patient_id
			FROM self_reports
			WHERE patient_id = ${ownerId} AND added_by_patient_id IS NOT NULL
			ORDER BY occurred_on DESC, id DESC
		`
	);
	const scans = await presentChart(
		ownerId,
		await client<{ id: number; title: string; performed_on: Date | string | null; added_by_patient_id: number }[]>`
			SELECT id, title, performed_on, added_by_patient_id
			FROM imaging_studies
			WHERE patient_id = ${ownerId} AND added_by_patient_id IS NOT NULL
			ORDER BY performed_on DESC NULLS LAST, id DESC
		`
	);
	const names = new Map<number, string>();
	for (const id of [...reports, ...scans].map((row) => row.added_by_patient_id)) {
		if (!names.has(id)) names.set(id, (await personName(id))?.name ?? '');
	}
	return {
		reports: reports.map((row) => ({ id: row.id, title: row.title, when: row.occurred_on, addedBy: names.get(row.added_by_patient_id) ?? '' })),
		scans: scans.map((row) => ({ id: row.id, title: row.title, when: row.performed_on, addedBy: names.get(row.added_by_patient_id) ?? '' }))
	};
}

export async function removeAddedReport(ownerId: number, reportId: number) {
	const [owned] = await client<{ id: number }[]>`
		SELECT id FROM self_reports
		WHERE id = ${reportId} AND patient_id = ${ownerId} AND added_by_patient_id IS NOT NULL
	`;
	if (!owned) return false;
	const files = await client<{ stored_name: string }[]>`
		SELECT stored_name FROM self_report_files WHERE report_id = ${reportId}
	`;
	await client`DELETE FROM self_report_files WHERE report_id = ${reportId}`;
	await client`DELETE FROM self_report_edits WHERE report_id = ${reportId}`;
	await client`DELETE FROM self_report_alerts WHERE report_id = ${reportId}`;
	await client`DELETE FROM self_reports WHERE id = ${reportId} AND patient_id = ${ownerId}`;
	for (const file of files) await deleteReportFile(file.stored_name);
	return true;
}

export async function removeAddedScan(ownerId: number, studyId: number) {
	const [row] = await client<{ id: number }[]>`
		DELETE FROM imaging_studies
		WHERE id = ${studyId} AND patient_id = ${ownerId} AND added_by_patient_id IS NOT NULL
		RETURNING id
	`;
	if (!row) return false;
	await deleteCircleScan(studyId);
	return true;
}

export async function prepareTrusteeFile(file: File) {
	if (!file || file.size === 0) return { error: 'Choose an image or a PDF.' as const };
	if (file.size > 8 * 1024 * 1024) return { error: 'The file must be 8 MB or smaller.' as const };
	const bytes = Buffer.from(await file.arrayBuffer());
	const kind = sniffDocument(bytes);
	if (!kind) return { error: 'Attach a JPEG, PNG, GIF, WebP, or PDF.' as const };
	return {
		name: file.name.replace(/[/\\]/g, '').slice(0, 120) || `scan.${kind.ext}`,
		bytes,
		type: kind.type,
		ext: kind.ext
	};
}
