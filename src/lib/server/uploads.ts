import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = join(process.cwd(), 'data', 'uploads');

export function taskPdfPath(id: number) {
	return join(dir, `task-${id}.pdf`);
}

export async function saveTaskPdf(id: number, bytes: Buffer) {
	await mkdir(dir, { recursive: true });
	await writeFile(taskPdfPath(id), bytes);
	return `task-${id}.pdf`;
}

export async function readTaskPdf(id: number) {
	return readFile(taskPdfPath(id));
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

export function reportFilePath(storedName: string) {
	if (!/^report-\d+-\d+\.(pdf|jpg|png|gif|webp)$/.test(storedName)) return null;
	return join(dir, storedName);
}

export async function saveReportFile(storedName: string, bytes: Buffer) {
	const path = reportFilePath(storedName);
	if (!path) throw new Error('Unsupported report file');
	await mkdir(dir, { recursive: true });
	await writeFile(path, bytes);
}

export async function readReportFile(storedName: string) {
	const path = reportFilePath(storedName);
	if (!path) throw new Error('Unsupported report file');
	return readFile(path);
}
