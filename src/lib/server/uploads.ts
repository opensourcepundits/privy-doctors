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
