export function imageKey(patientPid: string, type: string) {
	return `${patientPid}/${type}.png`;
}

function isStoredKey(path: string) {
	return !path.startsWith('/') && !path.startsWith('http');
}

export async function resolveImagePaths<T extends { image_path: string | null }>(rows: T[]) {
	return rows.map((row) => {
		if (!row.image_path || !isStoredKey(row.image_path)) return row;
		return { ...row, image_path: `/records/${row.image_path.replace(/^PID-/i, 'pid-')}` };
	});
}
