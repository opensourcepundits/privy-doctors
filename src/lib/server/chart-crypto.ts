import { DATA_KEK, KEYS_DATABASE_URL } from '$app/env/private';
import {
	blindIndex,
	generateDek,
	indexPepper,
	isSealedFile,
	isSealedText,
	openFileBytes,
	openString,
	sealFileBytes,
	sealString,
	unwrapDek,
	wrapDek
} from './crypto';
import { client, connectSql, type ClinicSql } from './db';
import {
	deletePrescriptionPhoto,
	deleteReportFile,
	deleteTaskPdf,
	deleteVaccineProof,
	readPrescriptionPhoto,
	readReportFile,
	readTaskPdf,
	readVaccineProof,
	savePrescriptionPhoto,
	saveReportFile,
	saveTaskPdf,
	saveVaccineProof
} from './uploads';

const DEV_KEK = Buffer.from('0123456789abcdef0123456789abcdef');

type ColumnKind = 'text' | 'number' | 'json';
type Column = { name: string; kind: ColumnKind };
type ChartState = { dek: Buffer | null; shredded: boolean };

const TEXT_FIELDS = new Set([
	'first_name',
	'last_name',
	'sex',
	'blood_type',
	'phone',
	'nic',
	'passport',
	'concierge_note',
	'insurance_name',
	'insurance_group',
	'insurance_member',
	'pharmacy_name',
	'pharmacy_address',
	'pharmacy_phone',
	'focus',
	'findings',
	'plan',
	'narrative',
	'pharmacy',
	'course_label',
	'label',
	'detail',
	'title',
	'note',
	'tags',
	'instructions',
	'file_name',
	'proof_name',
	'reason',
	'sig',
	'strength',
	'form',
	'route',
	'frequency',
	'supply_label',
	'schedule_slot',
	'schedule_detail',
	'remaining_label',
	'due_label',
	'refills',
	'summary',
	'impression',
	'protocol',
	'patient_quote',
	'outlook',
	'meta',
	'specimen',
	'value_text',
	'flag',
	'item_name',
	'duration',
	'severity',
	'meds_taken',
	'name',
	'category',
	'lot',
	'site',
	'body'
]);

const NUMBER_FIELDS = new Set(['systolic', 'diastolic', 'heart_rate', 'value_num']);
const JSON_FIELDS = new Set(['allergies', 'conditions', 'surgeries', 'vessels', 'changes']);

const PATIENT_TEXT = [
	'first_name',
	'last_name',
	'dob',
	'sex',
	'blood_type',
	'phone',
	'nic',
	'passport',
	'concierge_note',
	'insurance_name',
	'insurance_group',
	'insurance_member',
	'pharmacy_name',
	'pharmacy_address',
	'pharmacy_phone'
];

const DIRECT_TABLES: { table: string; columns: Column[] }[] = [
	{ table: 'encounters', columns: cols('focus', 'findings', 'plan') },
	{ table: 'consultations', columns: cols('narrative', 'pharmacy') },
	{ table: 'vitals', columns: [{ name: 'systolic', kind: 'number' }, { name: 'diastolic', kind: 'number' }, { name: 'heart_rate', kind: 'number' }, { name: 'note', kind: 'text' }] },
	{ table: 'prescriptions', columns: cols('pharmacy', 'course_label') },
	{ table: 'dose_logs', columns: cols('item_name', 'label') },
	{ table: 'labs', columns: cols('name', 'category', 'note', 'specimen', 'due_label') },
	{
		table: 'imaging_studies',
		columns: [...cols('title', 'summary', 'impression', 'protocol', 'patient_quote', 'outlook', 'meta'), { name: 'vessels', kind: 'json' }]
	},
	{ table: 'care_orders', columns: cols('title', 'instructions') },
	{ table: 'patient_tasks', columns: cols('title', 'detail', 'note', 'file_name') },
	{ table: 'referrals', columns: cols('note') },
	{ table: 'self_reports', columns: cols('title', 'detail', 'duration', 'severity', 'meds_taken') },
	{ table: 'medical_certificates', columns: cols('reason') },
	{ table: 'vaccinations', columns: cols('name', 'note', 'lot', 'site', 'proof_name') },
	{ table: 'notifications', columns: cols('title', 'body') }
];

export class ChartDeleted extends Error {
	constructor() {
		super('This medical record was deleted.');
		this.name = 'ChartDeleted';
	}
}

const memory = new Map<number, ChartState>();
let keysClient: ClinicSql | null = null;
let pepper: Buffer | null = null;
let ready = false;
let pending: Promise<void> | null = null;

function runtimeEnv(name: string) {
	const value = process.env[name];
	return typeof value === 'string' ? value.trim() : '';
}

export function dataKek() {
	const configured = runtimeEnv('DATA_KEK') || DATA_KEK?.trim();
	if (configured) return parseKey(configured);
	if (process.env.NODE_ENV !== 'production') return DEV_KEK;
	throw new Error(
		'Set DATA_KEK in the Vercel project environment to a 32-byte base64 or hex key, for Production and Preview, then redeploy. The running server does not have that variable.'
	);
}

export function identityIndex(value: string | null | undefined) {
	const normal = value?.trim().toLowerCase() ?? '';
	if (!normal) return null;
	pepper ??= indexPepper(dataKek());
	return blindIndex(pepper, normal);
}

export function ensureChartCrypto() {
	pending ??= migrate().catch((error) => {
		pending = null;
		ready = false;
		throw error;
	});
	return pending;
}

export async function sealText(patientId: number, column: string, value: string | null) {
	if (!ready) await ensureChartCrypto();
	if (value == null) return null;
	return sealString(await ensureDek(patientId), patientId, column, value);
}

export async function sealPatientFile(patientId: number, bytes: Buffer) {
	if (!ready) await ensureChartCrypto();
	return sealFileBytes(await ensureDek(patientId), patientId, bytes);
}

export async function openPatientFile(patientId: number, bytes: Buffer) {
	if (!ready) await ensureChartCrypto();
	if (!isSealedFile(bytes)) return bytes;
	const state = await chartState(patientId);
	if (!state.dek) return null;
	try {
		return openFileBytes(state.dek, patientId, bytes);
	} catch {
		return null;
	}
}

export async function presentChart<T>(patientId: number, value: T): Promise<T> {
	if (!ready) await ensureChartCrypto();
	const state = await chartState(patientId);
	return walk(patientId, value, state) as T;
}

export async function presentEach<T>(rows: T[]) {
	return Promise.all(
		rows.map(async (row) => {
			const id = patientIdOf(row);
			return id ? presentChart(id, row) : row;
		})
	);
}

export async function rebindChart(sql: ClinicSql, fromId: number, toId: number) {
	if (!ready) await ensureChartCrypto();
	if (fromId === toId) return;
	const from = await chartState(fromId);
	if (from.shredded) throw new ChartDeleted();
	const toDek = await ensureDek(toId);
	await rebindFiles(sql, from.dek, fromId, toDek, toId);
	await rebindDirect(sql, from, fromId, toId, toDek);
	await rebindJoined(sql, from, fromId, toId, toDek);
}

export async function discardDek(patientId: number) {
	memory.delete(patientId);
	await keysDb()`DELETE FROM patient_keys WHERE patient_id = ${patientId}`;
}

export async function shredPatient(patientId: number) {
	await ensureChartCrypto();
	const state = await chartState(patientId);
	if (!state.shredded) await sealPatient(patientId);
	await eraseFiles(patientId);
	memory.set(patientId, { dek: null, shredded: true });
	await keysDb()`DELETE FROM patient_keys WHERE patient_id = ${patientId}`;
	await client`
		UPDATE users SET name = 'Patient'
		WHERE id = (SELECT user_id FROM patients WHERE id = ${patientId})
		  AND role = 'patient'
	`;
}

async function migrate() {
	await keysDb()`
		CREATE TABLE IF NOT EXISTS patient_keys (
			patient_id int PRIMARY KEY,
			wrapped_dek text NOT NULL,
			kek_version int NOT NULL
		)
	`;
	for (const statement of [
		`ALTER TABLE patients ADD COLUMN IF NOT EXISTS nic_bidx text`,
		`ALTER TABLE patients ADD COLUMN IF NOT EXISTS passport_bidx text`,
		`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_nic_key`,
		`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_nic_unique`,
		`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_passport_key`,
		`ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_passport_unique`,
		`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS patient_id int`,
		`ALTER TABLE patient_tasks ADD COLUMN IF NOT EXISTS file_bytes bytea`,
		`ALTER TABLE self_report_files ADD COLUMN IF NOT EXISTS bytes bytea`,
		`ALTER TABLE self_reports ADD COLUMN IF NOT EXISTS added_by_patient_id int REFERENCES patients(id)`,
		`ALTER TABLE imaging_studies ADD COLUMN IF NOT EXISTS added_by_patient_id int REFERENCES patients(id)`,
		`ALTER TABLE imaging_studies ADD COLUMN IF NOT EXISTS added_file_type text`,
		`CREATE TABLE IF NOT EXISTS patient_trustees (
			id serial PRIMARY KEY,
			patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			trustee_patient_id int NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
			view_chart boolean NOT NULL DEFAULT true,
			accept_access boolean NOT NULL DEFAULT false,
			add_records boolean NOT NULL DEFAULT false,
			created_at timestamp NOT NULL,
			UNIQUE (patient_id, trustee_patient_id)
		)`
		`CREATE UNIQUE INDEX IF NOT EXISTS patients_nic_bidx_key ON patients (nic_bidx) WHERE nic_bidx IS NOT NULL`,
		`CREATE UNIQUE INDEX IF NOT EXISTS patients_passport_bidx_key ON patients (passport_bidx) WHERE passport_bidx IS NOT NULL`,
		`CREATE TABLE IF NOT EXISTS chart_crypto_state (id int PRIMARY KEY, backfill_done boolean NOT NULL)`
	]) {
		await client.unsafe(statement);
	}
	await client.unsafe(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'dob' AND data_type = 'date'
			) THEN
				ALTER TABLE patients ALTER COLUMN dob TYPE text USING dob::text;
			END IF;
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = 'public' AND table_name = 'vitals' AND column_name = 'systolic' AND data_type = 'integer'
			) THEN
				ALTER TABLE vitals ALTER COLUMN systolic TYPE text USING systolic::text;
				ALTER TABLE vitals ALTER COLUMN diastolic TYPE text USING diastolic::text;
				ALTER TABLE vitals ALTER COLUMN heart_rate TYPE text USING heart_rate::text;
			END IF;
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = 'public' AND table_name = 'lab_results' AND column_name = 'value_num' AND udt_name = 'numeric'
			) THEN
				ALTER TABLE lab_results ALTER COLUMN value_num TYPE text USING value_num::text;
			END IF;
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = 'public' AND table_name = 'prescription_items' AND column_name = 'indication'
			) THEN
				UPDATE consultation_orders SET detail = NULL, note = NULL WHERE kind = 'medication';
				UPDATE consultation_orders SET note = NULL WHERE kind = 'test';
				UPDATE consultation_orders SET detail = NULL WHERE kind = 'vaccine';
				UPDATE patient_tasks SET note = NULL
				WHERE order_id IN (SELECT id FROM consultation_orders WHERE kind = 'test');
				UPDATE patient_tasks SET detail = NULL
				WHERE order_id IN (SELECT id FROM consultation_orders WHERE kind = 'vaccine');
				IF EXISTS (
					SELECT 1 FROM information_schema.columns
					WHERE table_schema = 'public' AND table_name = 'care_orders' AND column_name = 'consultation_uid'
				) THEN
					UPDATE care_orders SET instructions = NULL WHERE kind = 'diagnostic' AND consultation_uid IS NOT NULL;
				END IF;
				ALTER TABLE prescription_items DROP COLUMN indication;
			END IF;
		END $$;
	`);
	ready = true;
	const [state] = await client<{ backfill_done: boolean }[]>`
		SELECT backfill_done FROM chart_crypto_state WHERE id = 1
	`;
	if (!state?.backfill_done) {
		await backfill();
		await client`
			INSERT INTO chart_crypto_state (id, backfill_done) VALUES (1, true)
			ON CONFLICT (id) DO UPDATE SET backfill_done = true
		`;
	}
}

async function backfill() {
	const patients = await client<{ id: number }[]>`SELECT id FROM patients ORDER BY id`;
	for (const patient of patients) {
		const state = await chartState(patient.id);
		if (state.shredded) continue;
		await sealPatient(patient.id);
	}
	await client`
		UPDATE users SET name = 'Patient'
		WHERE role = 'patient' AND name <> 'Patient' AND id IN (SELECT user_id FROM patients WHERE user_id IS NOT NULL)
	`;
}

async function sealPatient(patientId: number) {
	const dek = await ensureDek(patientId);
	const [row] = await client<Record<string, unknown>[]>`SELECT * FROM patients WHERE id = ${patientId}`;
	if (!row) return;
	const plain = openedRow(dek, patientId, patientColumns(), row);
	await writeRow(client, 'patients', patientId, dek, patientColumns(), plain);
	const nic = plain.nic == null ? null : String(plain.nic);
	const passport = plain.passport == null ? null : String(plain.passport);
	await client`
		UPDATE patients
		SET nic_bidx = ${identityIndex(nic)}, passport_bidx = ${identityIndex(passport)}
		WHERE id = ${patientId}
	`;
	for (const spec of DIRECT_TABLES) {
		const rows =
			spec.table === 'notifications'
				? await client<Record<string, unknown>[]>`SELECT * FROM notifications WHERE patient_id = ${patientId}`
				: await selectWhere(spec.table, 'patient_id', patientId);
		for (const record of rows) {
			await writeRow(client, spec.table, patientId, dek, spec.columns, openedRow(dek, patientId, spec.columns, record));
		}
	}
	await sealJoined(patientId, dek);
	await sealStoredFiles(patientId, dek);
}

async function sealJoined(patientId: number, dek: Buffer) {
	const joined: { table: string; sql: string; columns: Column[] }[] = [
		{
			table: 'consultation_entries',
			sql: `SELECT e.* FROM consultation_entries e JOIN consultations c ON c.id = e.consultation_id WHERE c.patient_id = $1`,
			columns: cols('label', 'detail')
		},
		{
			table: 'consultation_orders',
			sql: `SELECT o.* FROM consultation_orders o JOIN consultations c ON c.id = o.consultation_id WHERE c.patient_id = $1`,
			columns: cols('title', 'detail', 'note', 'tags')
		},
		{
			table: 'prescription_items',
			sql: `SELECT i.* FROM prescription_items i JOIN prescriptions rx ON rx.id = i.prescription_id WHERE rx.patient_id = $1`,
			columns: cols('name', 'strength', 'form', 'route', 'frequency', 'sig', 'supply_label', 'schedule_slot', 'schedule_detail', 'remaining_label', 'due_label', 'refills')
		},
		{
			table: 'lab_results',
			sql: `SELECT r.* FROM lab_results r JOIN labs l ON l.id = r.lab_id WHERE l.patient_id = $1`,
			columns: [...cols('name', 'detail', 'value_text', 'flag'), { name: 'value_num', kind: 'number' }]
		},
		{
			table: 'self_report_edits',
			sql: `SELECT e.* FROM self_report_edits e JOIN self_reports r ON r.id = e.report_id WHERE r.patient_id = $1`,
			columns: [{ name: 'changes', kind: 'json' }]
		},
		{
			table: 'self_report_files',
			sql: `SELECT f.* FROM self_report_files f JOIN self_reports r ON r.id = f.report_id WHERE r.patient_id = $1`,
			columns: cols('file_name')
		},
		{
			table: 'prescription_photos',
			sql: `SELECT p.* FROM prescription_photos p JOIN consultations c ON c.id = p.consultation_id WHERE c.patient_id = $1`,
			columns: cols('file_name')
		}
	];
	for (const spec of joined) {
		const rows = await client.unsafe<Record<string, unknown>[]>(spec.sql, [patientId]);
		for (const row of rows) await writeRow(client, spec.table, patientId, dek, spec.columns, openedRow(dek, patientId, spec.columns, row));
	}
}

async function sealStoredFiles(patientId: number, dek: Buffer) {
	const tasks = await client<{ id: number; stored_name: string | null }[]>`
		SELECT id, stored_name FROM patient_tasks WHERE patient_id = ${patientId} AND stored_name IS NOT NULL
	`;
	for (const task of tasks) {
		try {
			const bytes = await readTaskPdf(task.id);
			if (!isSealedFile(bytes)) await saveTaskPdf(task.id, sealFileBytes(dek, patientId, bytes));
		} catch {
			/* The upload is already gone. */
		}
	}
	const reports = await client<{ stored_name: string }[]>`
		SELECT f.stored_name
		FROM self_report_files f
		JOIN self_reports r ON r.id = f.report_id
		WHERE r.patient_id = ${patientId}
	`;
	for (const file of reports) {
		try {
			const bytes = await readReportFile(file.stored_name);
			if (!isSealedFile(bytes)) await saveReportFile(file.stored_name, sealFileBytes(dek, patientId, bytes));
		} catch {
			/* The upload is already gone. */
		}
	}
	const photos = await client<{ stored_name: string }[]>`
		SELECT p.stored_name
		FROM prescription_photos p
		JOIN consultations c ON c.id = p.consultation_id
		WHERE c.patient_id = ${patientId}
	`;
	for (const photo of photos) {
		const bytes = await readPrescriptionPhoto(photo.stored_name);
		if (!bytes || isSealedFile(bytes)) continue;
		await savePrescriptionPhoto(photo.stored_name, sealFileBytes(dek, patientId, bytes));
	}
	const proofs = await client<{ id: number }[]>`
		SELECT id FROM vaccinations WHERE patient_id = ${patientId} AND proof_name IS NOT NULL
	`;
	for (const proof of proofs) {
		const bytes = await readVaccineProof(proof.id);
		if (!bytes || isSealedFile(bytes)) continue;
		await saveVaccineProof(proof.id, sealFileBytes(dek, patientId, bytes));
	}
}

async function eraseFiles(patientId: number) {
	const tasks = await client<{ id: number }[]>`
		SELECT id FROM patient_tasks
		WHERE patient_id = ${patientId} AND (stored_name IS NOT NULL OR file_bytes IS NOT NULL)
	`;
	for (const task of tasks) await deleteTaskPdf(task.id);
	const reports = await client<{ stored_name: string }[]>`
		SELECT f.stored_name
		FROM self_report_files f
		JOIN self_reports r ON r.id = f.report_id
		WHERE r.patient_id = ${patientId}
	`;
	for (const file of reports) await deleteReportFile(file.stored_name);
	const photos = await client<{ stored_name: string }[]>`
		SELECT p.stored_name
		FROM prescription_photos p
		JOIN consultations c ON c.id = p.consultation_id
		WHERE c.patient_id = ${patientId}
	`;
	for (const photo of photos) await deletePrescriptionPhoto(photo.stored_name);
	await client`
		UPDATE prescription_photos SET bytes = NULL
		WHERE consultation_id IN (SELECT id FROM consultations WHERE patient_id = ${patientId})
	`;
	const proofs = await client<{ id: number }[]>`
		SELECT id FROM vaccinations WHERE patient_id = ${patientId} AND proof_name IS NOT NULL
	`;
	for (const proof of proofs) await deleteVaccineProof(proof.id);
	await client`UPDATE vaccinations SET proof_bytes = NULL WHERE patient_id = ${patientId}`;
}

async function rebindDirect(sql: ClinicSql, from: ChartState, fromId: number, toId: number, toDek: Buffer) {
	for (const spec of DIRECT_TABLES) {
		if (spec.table === 'notifications') continue;
		const rows = await selectWhere(spec.table, 'patient_id', fromId, sql);
		for (const row of rows) {
			const plain = openedRow(from.dek, fromId, spec.columns, row);
			await writeRow(sql, spec.table, toId, toDek, spec.columns, plain, toId);
		}
	}
	const notes = await sql<Record<string, unknown>[]>`SELECT * FROM notifications WHERE patient_id = ${fromId}`;
	for (const row of notes) {
		const plain = openedRow(from.dek, fromId, cols('title', 'body'), row);
		await writeRow(sql, 'notifications', toId, toDek, cols('title', 'body'), plain, toId);
	}
}

async function rebindJoined(sql: ClinicSql, from: ChartState, fromId: number, toId: number, toDek: Buffer) {
	const specs: { table: string; query: string; columns: Column[] }[] = [
		{
			table: 'consultation_entries',
			query: `SELECT e.* FROM consultation_entries e JOIN consultations c ON c.id = e.consultation_id WHERE c.patient_id = $1`,
			columns: cols('label', 'detail')
		},
		{
			table: 'consultation_orders',
			query: `SELECT o.* FROM consultation_orders o JOIN consultations c ON c.id = o.consultation_id WHERE c.patient_id = $1`,
			columns: cols('title', 'detail', 'note', 'tags')
		},
		{
			table: 'prescription_items',
			query: `SELECT i.* FROM prescription_items i JOIN prescriptions rx ON rx.id = i.prescription_id WHERE rx.patient_id = $1`,
			columns: cols('name', 'strength', 'form', 'route', 'frequency', 'sig', 'supply_label', 'schedule_slot', 'schedule_detail', 'remaining_label', 'due_label', 'refills')
		},
		{
			table: 'lab_results',
			query: `SELECT r.* FROM lab_results r JOIN labs l ON l.id = r.lab_id WHERE l.patient_id = $1`,
			columns: [...cols('name', 'detail', 'value_text', 'flag'), { name: 'value_num', kind: 'number' }]
		},
		{
			table: 'self_report_edits',
			query: `SELECT e.* FROM self_report_edits e JOIN self_reports r ON r.id = e.report_id WHERE r.patient_id = $1`,
			columns: [{ name: 'changes', kind: 'json' }]
		},
		{
			table: 'self_report_files',
			query: `SELECT f.* FROM self_report_files f JOIN self_reports r ON r.id = f.report_id WHERE r.patient_id = $1`,
			columns: cols('file_name')
		},
		{
			table: 'prescription_photos',
			query: `SELECT p.* FROM prescription_photos p JOIN consultations c ON c.id = p.consultation_id WHERE c.patient_id = $1`,
			columns: cols('file_name')
		}
	];
	for (const spec of specs) {
		const rows = await sql.unsafe<Record<string, unknown>[]>(spec.query, [fromId]);
		for (const row of rows) {
			await writeRow(sql, spec.table, toId, toDek, spec.columns, openedRow(from.dek, fromId, spec.columns, row));
		}
	}
}

async function rebindFiles(sql: ClinicSql, fromDek: Buffer | null, fromId: number, toDek: Buffer, toId: number) {
	const reseal = (bytes: Buffer) =>
		sealFileBytes(toDek, toId, fromDek && isSealedFile(bytes) ? openFileBytes(fromDek, fromId, bytes) : bytes);
	const tasks = await sql<{ id: number }[]>`SELECT id FROM patient_tasks WHERE patient_id = ${fromId} AND stored_name IS NOT NULL`;
	for (const task of tasks) {
		try {
			await saveTaskPdf(task.id, reseal(await readTaskPdf(task.id)), sql);
		} catch {
			/* Missing uploads are skipped. */
		}
	}
	const reports = await sql<{ stored_name: string }[]>`
		SELECT f.stored_name
		FROM self_report_files f
		JOIN self_reports r ON r.id = f.report_id
		WHERE r.patient_id = ${fromId}
	`;
	for (const file of reports) {
		try {
			await saveReportFile(file.stored_name, reseal(await readReportFile(file.stored_name)), sql);
		} catch {
			/* Missing uploads are skipped. */
		}
	}
	const photos = await sql<{ stored_name: string }[]>`
		SELECT p.stored_name
		FROM prescription_photos p
		JOIN consultations c ON c.id = p.consultation_id
		WHERE c.patient_id = ${fromId}
	`;
	for (const photo of photos) {
		const bytes = await readPrescriptionPhoto(photo.stored_name);
		if (bytes) await savePrescriptionPhoto(photo.stored_name, reseal(bytes), sql);
	}
	const proofs = await sql<{ id: number }[]>`
		SELECT id FROM vaccinations WHERE patient_id = ${fromId} AND proof_name IS NOT NULL
	`;
	for (const proof of proofs) {
		const bytes = await readVaccineProof(proof.id);
		if (bytes) await saveVaccineProof(proof.id, reseal(bytes), sql);
	}
}

function patientColumns(): Column[] {
	return [...PATIENT_TEXT.map((name) => ({ name, kind: 'text' as const })), ...['allergies', 'conditions', 'surgeries'].map((name) => ({ name, kind: 'json' as const }))];
}

function openedRow(dek: Buffer | null, patientId: number, columns: Column[], row: Record<string, unknown>) {
	const plain: Record<string, unknown> = { ...row };
	for (const column of columns) plain[column.name] = materialize(dek, patientId, column, row[column.name]);
	return plain;
}

function materialize(dek: Buffer | null, patientId: number, column: Column, value: unknown) {
	if (value == null) return null;
	if (column.kind === 'json' && typeof value !== 'string') return JSON.stringify(value);
	const text = value instanceof Date ? isoDate(value) : String(value);
	if (!isSealedText(text)) return text;
	if (!dek) return null;
	return openString(dek, patientId, column.name, text);
}

async function writeRow(
	sql: ClinicSql,
	table: string,
	patientId: number,
	dek: Buffer,
	columns: Column[],
	plain: Record<string, unknown>,
	moveTo?: number
) {
	if (!/^[a-z_]+$/.test(table)) throw new Error('Unexpected chart table.');
	const sets: string[] = [];
	const args: unknown[] = [];
	for (const column of columns) {
		if (!/^[a-z_]+$/.test(column.name)) throw new Error('Unexpected chart column.');
		const current = plain[column.name];
		if (current == null) continue;
		const text = String(current);
		if (isSealedText(text)) continue;
		const sealed = sealString(dek, patientId, column.name, text);
		args.push(column.kind === 'json' ? JSON.stringify(sealed) : sealed);
		sets.push(column.kind === 'json' ? `${column.name} = $${args.length}::jsonb` : `${column.name} = $${args.length}`);
	}
	if (moveTo != null) {
		args.push(moveTo);
		sets.push(`patient_id = $${args.length}`);
	}
	if (!sets.length) return;
	args.push(plain.id);
	await sql.unsafe(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${args.length}`, args);
}

async function selectWhere(table: string, column: string, id: number, sql: ClinicSql = client) {
	if (!/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) throw new Error('Unexpected chart table.');
	return sql.unsafe<Record<string, unknown>[]>(`SELECT * FROM ${table} WHERE ${column} = $1`, [id]);
}

async function ensureDek(patientId: number) {
	const state = await chartState(patientId);
	if (state.shredded) throw new ChartDeleted();
	if (state.dek) return state.dek;
	const dek = generateDek();
	const wrapped = wrapDek(dataKek(), patientId, dek);
	await keysDb()`
		INSERT INTO patient_keys (patient_id, wrapped_dek, kek_version)
		VALUES (${patientId}, ${wrapped}, 1)
		ON CONFLICT (patient_id) DO NOTHING
	`;
	const [saved] = await keysDb()<{ wrapped_dek: string }[]>`
		SELECT wrapped_dek FROM patient_keys WHERE patient_id = ${patientId}
	`;
	const actual = unwrapDek(dataKek(), patientId, saved.wrapped_dek);
	memory.set(patientId, { dek: actual, shredded: false });
	return actual;
}

async function chartState(patientId: number): Promise<ChartState> {
	const hit = memory.get(patientId);
	if (hit) return hit;
	const [key] = await keysDb()<{ wrapped_dek: string }[]>`
		SELECT wrapped_dek FROM patient_keys WHERE patient_id = ${patientId}
	`;
	if (key) {
		const state = { dek: unwrapDek(dataKek(), patientId, key.wrapped_dek), shredded: false };
		memory.set(patientId, state);
		return state;
	}
	const [patient] = await client<{ first_name: string }[]>`SELECT first_name FROM patients WHERE id = ${patientId}`;
	if (isSealedText(patient?.first_name)) {
		const state = { dek: null, shredded: true };
		memory.set(patientId, state);
		return state;
	}
	return { dek: null, shredded: false };
}

function keysDatabaseUrl() {
	const configured = runtimeEnv('KEYS_DATABASE_URL') || KEYS_DATABASE_URL?.trim();
	return configured || null;
}

function keysDb() {
	if (!keysClient) {
		const url = keysDatabaseUrl();
		keysClient = url ? connectSql(url) : client;
	}
	return keysClient;
}

function walk(patientId: number, value: unknown, state: ChartState): unknown {
	if (Array.isArray(value)) return value.map((item) => walk(patientId, item, state));
	if (!isRecord(value)) return value;
	const next: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(value)) {
		if (key === 'nic_bidx' || key === 'passport_bidx') continue;
		if (key === 'dob') next.dob = state.shredded ? null : revealDob(state, patientId, field);
		else if (JSON_FIELDS.has(key)) next[key] = revealJson(state, patientId, key, field);
		else if (NUMBER_FIELDS.has(key)) next[key] = revealNumber(state, patientId, key, field);
		else if (TEXT_FIELDS.has(key)) next[key] = revealText(state, patientId, key, field);
		else next[key] = isContainer(field) ? walk(patientId, field, state) : field;
	}
	if (state.shredded) next.shredded = true;
	return next;
}

function revealDob(state: ChartState, patientId: number, value: unknown) {
	const text = revealText(state, patientId, 'dob', value instanceof Date ? isoDate(value) : value);
	return typeof text === 'string' ? text.slice(0, 10) : text;
}

function revealText(state: ChartState, patientId: number, column: string, value: unknown) {
	if (state.shredded) return tombstone(column);
	if (value == null) return null;
	if (typeof value !== 'string') return value;
	if (!isSealedText(value)) return value;
	if (!state.dek) return tombstone(column);
	try {
		return openString(state.dek, patientId, column, value);
	} catch {
		return tombstone(column);
	}
}

function revealNumber(state: ChartState, patientId: number, column: string, value: unknown) {
	if (state.shredded) return null;
	if (typeof value === 'number') return value;
	if (typeof value !== 'string' || value === '') return value ?? null;
	let text = value;
	if (isSealedText(value)) {
		if (!state.dek) return null;
		try {
			text = openString(state.dek, patientId, column, value);
		} catch {
			return null;
		}
	}
	const number = Number(text);
	return Number.isFinite(number) ? number : null;
}

function revealJson(state: ChartState, patientId: number, column: string, value: unknown) {
	if (state.shredded || value == null) return [];
	let current = value;
	// jsonb stores the seal as a JSON string, so the driver can hand back
	// "enc:v1:..." or a JSON string of the list. Peel those layers until an array remains.
	for (let pass = 0; pass < 4 && typeof current === 'string'; pass++) {
		const text = current.trim();
		if (isSealedText(text)) {
			if (!state.dek) return [];
			try {
				current = openString(state.dek, patientId, column, text);
			} catch {
				return [];
			}
			continue;
		}
		if (text.startsWith('[') || text.startsWith('{') || text.startsWith('"')) {
			try {
				current = JSON.parse(text) as unknown;
			} catch {
				return [];
			}
			continue;
		}
		return [];
	}
	return Array.isArray(current) ? current : [];
}

function tombstone(column: string) {
	if (column === 'first_name') return 'Deleted';
	if (column === 'last_name') return 'patient';
	if (column === 'title') return 'Medical record deleted';
	if (column === 'dob') return null;
	return '';
}

function patientIdOf(row: unknown) {
	if (!isRecord(row)) return null;
	if (typeof row.patient_id === 'number') return row.patient_id;
	if (typeof row.pid === 'string' && typeof row.id === 'number') return row.id;
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !Buffer.isBuffer(value);
}

function isContainer(value: unknown) {
	return Array.isArray(value) || isRecord(value);
}

function cols(...names: string[]): Column[] {
	return names.map((name) => ({ name, kind: 'text' as const }));
}

function isoDate(value: Date) {
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function parseKey(value: string) {
	const trimmed = value.trim();
	if (/^[0-9a-f]{64}$/i.test(trimmed)) return Buffer.from(trimmed, 'hex');
	const decoded = Buffer.from(trimmed, 'base64');
	if (decoded.length === 32) return decoded;
	throw new Error('DATA_KEK must be 32 bytes, as base64 or hex.');
}
