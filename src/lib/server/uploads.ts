import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { del, get, put } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN } from '$app/env/private';
import { client, type ClinicSql } from './db';

// Uploads live in a private Vercel Blob store. Files saved before the move are still
// read from their old Postgres columns or the local data folder until they are rewritten.
const dir = join(process.cwd(), 'data', 'uploads');

function blobToken() {
	const value = process.env.BLOB_READ_WRITE_TOKEN?.trim() || BLOB_READ_WRITE_TOKEN?.trim();
	if (value) return value;
	if (process.env.NODE_ENV !== 'production') return null;
	throw new Error(
		'Set BLOB_READ_WRITE_TOKEN in the Vercel project environment by connecting a private Blob store, then redeploy. The running server does not have that variable.'
	);
}

function localPath(key: string) {
	return join(dir, ...key.split('/'));
}

async function putFile(key: string, bytes: Buffer) {
	const token = blobToken();
	if (!token) {
		const path = localPath(key);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, bytes);
		return;
	}
	await put(key, bytes, {
		access: 'private',
		token,
		addRandomSuffix: false,
		allowOverwrite: true,
		contentType: 'application/octet-stream'
	});
}

async function getFile(key: string) {
	const token = blobToken();
	if (!token) return readFile(localPath(key)).catch(() => null);
	const found = await get(key, { access: 'private', token, useCache: false });
	if (!found || found.statusCode !== 200) return null;
	return Buffer.from(await new Response(found.stream).arrayBuffer());
}

async function deleteFile(key: string) {
	const token = blobToken();
	if (!token) {
		await rm(localPath(key), { force: true });
		return;
	}
	await del(key, { token });
}

async function legacyFile(name: string) {
	return readFile(join(dir, name)).catch(() => null);
}

async function legacyColumn(query: Promise<{ encoded: string | null }[]>) {
	const [row] = await query;
	return row?.encoded ? Buffer.from(row.encoded, 'base64') : null;
}

function taskKey(id: number) {
	return `tasks/task-${id}.pdf`;
}

export async function saveTaskPdf(id: number, bytes: Buffer, sql: ClinicSql = client) {
	await putFile(taskKey(id), bytes);
	await sql`UPDATE patient_tasks SET file_bytes = NULL WHERE id = ${id} AND file_bytes IS NOT NULL`;
	return `task-${id}.pdf`;
}

export async function readTaskPdf(id: number) {
	const bytes =
		(await getFile(taskKey(id))) ??
		(await legacyColumn(client`SELECT encode(file_bytes, 'base64') AS encoded FROM patient_tasks WHERE id = ${id}`)) ??
		(await legacyFile(`task-${id}.pdf`));
	if (!bytes) throw new Error('Task file is missing');
	return bytes;
}

export async function deleteTaskPdf(id: number) {
	await deleteFile(taskKey(id));
	await client`UPDATE patient_tasks SET file_bytes = NULL WHERE id = ${id} AND file_bytes IS NOT NULL`;
	await rm(join(dir, `task-${id}.pdf`), { force: true });
}

export function sniffDocument(bytes: Buffer) {
	if (bytes.subarray(0, 5).toString('utf8') === '%PDF-') return { ext: 'pdf', type: 'application/pdf' };
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: 'png', type: 'image/png' };
	const gif = bytes.subarray(0, 6).toString('utf8');
	if (gif === 'GIF87a' || gif === 'GIF89a') return { ext: 'gif', type: 'image/gif' };
	if (bytes.subarray(0, 4).toString('utf8') === 'RIFF' && bytes.subarray(8, 12).toString('utf8') === 'WEBP') {
		return { ext: 'webp', type: 'image/webp' };
	}
	return null;
}

function reportKey(storedName: string) {
	if (!/^report-\d+-\d+\.(pdf|jpg|png|gif|webp)$/.test(storedName)) return null;
	return `reports/${storedName}`;
}

export async function saveReportFile(storedName: string, bytes: Buffer, sql: ClinicSql = client) {
	const key = reportKey(storedName);
	if (!key) throw new Error('Unsupported report file');
	await putFile(key, bytes);
	await sql`UPDATE self_report_files SET bytes = NULL WHERE stored_name = ${storedName} AND bytes IS NOT NULL`;
}

export async function readReportFile(storedName: string) {
	const key = reportKey(storedName);
	if (!key) throw new Error('Unsupported report file');
	const bytes =
		(await getFile(key)) ??
		(await legacyColumn(
			client`SELECT encode(bytes, 'base64') AS encoded FROM self_report_files WHERE stored_name = ${storedName}`
		)) ??
		(await legacyFile(storedName));
	if (!bytes) throw new Error('Report file is missing');
	return bytes;
}

export async function deleteReportFile(storedName: string) {
	const key = reportKey(storedName);
	if (!key) return;
	await deleteFile(key);
	await client`UPDATE self_report_files SET bytes = NULL WHERE stored_name = ${storedName} AND bytes IS NOT NULL`;
	await rm(join(dir, storedName), { force: true });
}

function prescriptionPhotoKey(storedName: string) {
	if (!/^rx-\d+-\d+\.(jpg|png|gif|webp)$/.test(storedName)) return null;
	return `prescriptions/${storedName}`;
}

export async function savePrescriptionPhoto(storedName: string, bytes: Buffer, sql: ClinicSql = client) {
	const key = prescriptionPhotoKey(storedName);
	if (!key) throw new Error('Invalid prescription photo name');
	await putFile(key, bytes);
	await sql`UPDATE prescription_photos SET bytes = NULL WHERE stored_name = ${storedName} AND bytes IS NOT NULL`;
}

export async function readPrescriptionPhoto(storedName: string) {
	const key = prescriptionPhotoKey(storedName);
	if (!key) return null;
	return (
		(await getFile(key)) ??
		(await legacyColumn(
			client`SELECT encode(bytes, 'base64') AS encoded FROM prescription_photos WHERE stored_name = ${storedName}`
		)) ??
		(await legacyFile(storedName))
	);
}

export async function deletePrescriptionPhoto(storedName: string) {
	const key = prescriptionPhotoKey(storedName);
	if (!key) return;
	await deleteFile(key);
	await rm(join(dir, storedName), { force: true });
}

function vaccineProofKey(id: number) {
	return `vaccinations/proof-${id}`;
}

export async function saveVaccineProof(id: number, bytes: Buffer, sql: ClinicSql = client) {
	await putFile(vaccineProofKey(id), bytes);
	await sql`UPDATE vaccinations SET proof_bytes = NULL WHERE id = ${id} AND proof_bytes IS NOT NULL`;
}

export async function readVaccineProof(id: number) {
	return (
		(await getFile(vaccineProofKey(id))) ??
		(await legacyColumn(client`SELECT encode(proof_bytes, 'base64') AS encoded FROM vaccinations WHERE id = ${id}`))
	);
}

export async function deleteVaccineProof(id: number) {
	await deleteFile(vaccineProofKey(id));
}

function circleScanKey(id: number) {
	return `circle/scan-${id}`;
}

export async function saveCircleScan(id: number, bytes: Buffer) {
	await putFile(circleScanKey(id), bytes);
}

export async function readCircleScan(id: number) {
	const bytes = await getFile(circleScanKey(id));
	if (!bytes) throw new Error('Scan file is missing');
	return bytes;
}

export async function deleteCircleScan(id: number) {
	await deleteFile(circleScanKey(id));
}

export async function acceptImageFile(file: File, emptyError: string) {
	if (!file || file.size === 0) return { error: emptyError };
	if (file.size > 8 * 1024 * 1024) return { error: 'The photo must be 8 MB or smaller.' as const };
	const bytes = Buffer.from(await file.arrayBuffer());
	const kind = sniffDocument(bytes);
	if (!kind || kind.ext === 'pdf') return { error: 'Attach a JPEG, PNG, GIF, or WebP photo.' as const };
	const name = file.name.replace(/[/\\]/g, '').slice(0, 120) || `photo.${kind.ext}`;
	return { name, bytes, ext: kind.ext, type: kind.type };
}

export async function optionalImage(file: unknown) {
	if (!(file instanceof File) || file.size === 0) return null;
	return acceptImageFile(file, 'Choose a photo of the vaccination record.');
}

export async function acceptPrescriptionPhoto(file: File) {
	if (!file || file.size === 0) return { error: 'Choose a photo of the prescription.' as const };
	if (file.size > 8 * 1024 * 1024) return { error: 'The photo must be 8 MB or smaller.' as const };
	const bytes = Buffer.from(await file.arrayBuffer());
	const kind = sniffDocument(bytes);
	if (!kind || kind.ext === 'pdf') return { error: 'Attach a JPEG, PNG, GIF, or WebP photo.' as const };
	const name = file.name.replace(/[/\\]/g, '').slice(0, 120) || `prescription.${kind.ext}`;
	return { name, bytes, ext: kind.ext, type: kind.type };
}
