import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

export const SEAL_PREFIX = 'enc:v1:';
const FILE_MAGIC = Buffer.from('ENC1');

export function isSealedText(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith(SEAL_PREFIX);
}

export function indexPepper(kek: Buffer) {
	return Buffer.from(hkdfSync('sha256', kek, Buffer.from('privy-doctors'), Buffer.from('blind-index'), 32));
}

export function blindIndex(pepper: Buffer, value: string) {
	return createHmac('sha256', pepper).update(value.trim().toLowerCase()).digest('hex');
}

export function generateDek() {
	return randomBytes(32);
}

export function wrapDek(kek: Buffer, patientId: number, dek: Buffer) {
	return encrypt(kek, Buffer.from(`dek:${patientId}`), dek).toString('base64');
}

export function unwrapDek(kek: Buffer, patientId: number, wrapped: string) {
	return decrypt(kek, Buffer.from(`dek:${patientId}`), Buffer.from(wrapped, 'base64'));
}

export function sealString(dek: Buffer, patientId: number, column: string, value: string) {
	if (value.startsWith(SEAL_PREFIX)) return value;
	return SEAL_PREFIX + encrypt(dek, aad(patientId, column), Buffer.from(value, 'utf8')).toString('base64');
}

export function openString(dek: Buffer, patientId: number, column: string, value: string) {
	if (!value.startsWith(SEAL_PREFIX)) return value;
	return decrypt(dek, aad(patientId, column), Buffer.from(value.slice(SEAL_PREFIX.length), 'base64')).toString('utf8');
}

export function isSealedFile(bytes: Buffer) {
	return bytes.length > FILE_MAGIC.length + 28 && bytes.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC);
}

export function sealFileBytes(dek: Buffer, patientId: number, bytes: Buffer) {
	if (isSealedFile(bytes)) return bytes;
	return Buffer.concat([FILE_MAGIC, encrypt(dek, aad(patientId, 'file'), bytes)]);
}

export function openFileBytes(dek: Buffer, patientId: number, bytes: Buffer) {
	if (!isSealedFile(bytes)) return bytes;
	return decrypt(dek, aad(patientId, 'file'), bytes.subarray(FILE_MAGIC.length));
}

function aad(patientId: number, column: string) {
	return Buffer.from(`${patientId}:${column}`);
}

function encrypt(key: Buffer, aadBytes: Buffer, plaintext: Buffer) {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	cipher.setAAD(aadBytes);
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

function decrypt(key: Buffer, aadBytes: Buffer, payload: Buffer) {
	const iv = payload.subarray(0, 12);
	const tag = payload.subarray(12, 28);
	const ciphertext = payload.subarray(28);
	const decipher = createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAAD(aadBytes);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
