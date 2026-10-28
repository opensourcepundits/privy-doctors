import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';

const env = Object.fromEntries(
	readFileSync(new URL('../.env', import.meta.url), 'utf8')
		.split(/\r?\n/)
		.filter((line) => line && !line.startsWith('#'))
		.map((line) => {
			const index = line.indexOf('=');
			return [line.slice(0, index), line.slice(index + 1)];
		})
);

const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;
if (!databaseUrl) throw new Error('Set DATABASE_URL to export the local database.');

const sql = postgres(databaseUrl, {
	onnotice: () => {},
	types: {
		timestamp: {
			to: 1114,
			from: [1114, 1184],
			serialize: (value) => value,
			parse: (value) => value
		},
		date: {
			to: 1082,
			from: [1082],
			serialize: (value) => value,
			parse: (value) => value
		}
	}
});

const order = [
	'users',
	'doctors',
	'patients',
	'availability',
	'appointments',
	'consultations',
	'encounters',
	'vitals',
	'prescriptions',
	'prescription_items',
	'dose_logs',
	'labs',
	'lab_results',
	'imaging_studies',
	'care_orders',
	'invoices',
	'invoice_lines',
	'consultation_entries',
	'consultation_orders',
	'patient_tasks',
	'refill_requests',
	'referrals',
	'patient_access',
	'access_codes',
	'self_reports',
	'self_report_edits',
	'notifications',
	'sessions',
	'practice_metrics',
	'modality_volumes',
	'cohorts',
	'referral_sources',
	'practice_notes'
];

function quote(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

function stamp(value) {
	const pad = (part) => String(part).padStart(2, '0');
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function wallClock(value) {
	if (typeof value !== 'string') return value;
	const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2}(?::?\d{2})?|Z)$/);
	if (!match) return value;
	let offset = match[3];
	if (offset === '+00' || offset === '-00') offset = 'Z';
	else if (/^[+-]\d{2}$/.test(offset)) offset = `${offset}:00`;
	else if (/^[+-]\d{4}$/.test(offset)) offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
	const date = new Date(`${match[1]}T${match[2]}${offset}`);
	return Number.isNaN(date.getTime()) ? value : stamp(date);
}

function literal(value, udt) {
	if (value === null || value === undefined) return 'NULL';
	if (value instanceof Date) return quote(udt === 'date' ? stamp(value).slice(0, 10) : stamp(value));
	if (udt === 'timestamp' || udt === 'timestamptz') value = wallClock(value);
	if (udt === 'bool') return value ? 'TRUE' : 'FALSE';
	if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric'].includes(udt)) return String(value);
	if (udt === 'json' || udt === 'jsonb') {
		const json = typeof value === 'string' ? value : JSON.stringify(value);
		return `${quote(json)}::${udt}`;
	}
	return quote(value);
}

const existing = await sql`
	SELECT tablename FROM pg_tables WHERE schemaname = 'public'
`;
const names = new Set(existing.map((row) => row.tablename));
const tables = [...order.filter((name) => names.has(name)), ...[...names].filter((name) => !order.includes(name)).sort()];

const chunks = [];
for (const table of tables) {
	const columns = await sql`
		SELECT column_name, udt_name
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = ${table}
		ORDER BY ordinal_position
	`;
	const rows = await sql.unsafe(`SELECT * FROM ${table} ORDER BY 1`);
	if (!rows.length) continue;
	const listed = columns.map((column) => `"${column.column_name}"`).join(', ');
	for (const row of rows) {
		const values = columns.map((column) => {
			let value = row[column.column_name];
			return literal(value, column.udt_name);
		});
		chunks.push(`INSERT INTO ${table} (${listed}) VALUES (${values.join(', ')});`);
	}
}

const sequences = await sql`
	SELECT table_name, column_name
	FROM information_schema.columns
	WHERE table_schema = 'public' AND column_default LIKE 'nextval%'
	ORDER BY table_name
`;
const resets = sequences.map(
	(column) =>
		`SELECT setval(pg_get_serial_sequence('${column.table_name}', '${column.column_name}'), GREATEST(COALESCE((SELECT MAX("${column.column_name}") FROM ${column.table_name}), 1), 1));`
);

const schema = readFileSync(new URL('../src/lib/server/schema.sql', import.meta.url), 'utf8').trim();
const sqlText = `-- careOS populate script for a Neon database.
-- Run once in the Neon SQL editor. It creates the clinic tables and loads the current records.
-- Do not run this against the local Docker database.
-- Study images stay in static/records and are served by the app.

BEGIN;

${schema}

${chunks.join('\n')}

${resets.join('\n')}

COMMIT;
`;

mkdirSync(new URL('../neon/', import.meta.url), { recursive: true });
writeFileSync(new URL('../neon/populate.sql', import.meta.url), sqlText);
console.log(`Wrote neon/populate.sql (${chunks.length} inserts).`);
await sql.end();
