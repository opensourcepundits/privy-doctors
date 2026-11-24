import { randomBytes } from 'node:crypto';
import { client } from './db';
import { hashPassword, verifyPassword } from './password';

export type SessionUser = {
	id: number;
	email: string;
	role: 'doctor' | 'patient';
	name: string;
};

export async function userByEmail(email: string) {
	const [user] = await client<
		{ id: number; email: string; password_hash: string; role: 'doctor' | 'patient'; name: string }[]
	>`SELECT id, email, password_hash, role, name FROM users WHERE email = ${email}`;
	return user ?? null;
}

const recentSessions = new Map<string, { at: number; user: SessionUser }>();

export async function userFromSession(sessionId: string | undefined) {
	if (!sessionId) return null;
	const hit = recentSessions.get(sessionId);
	if (hit && Date.now() - hit.at < 20_000) return hit.user;
	const [user] = await client<SessionUser[]>`
		SELECT u.id, u.email, u.role, u.name
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.id = ${sessionId} AND s.expires_at > now()
	`;
	if (!user) {
		recentSessions.delete(sessionId);
		return null;
	}
	recentSessions.set(sessionId, { at: Date.now(), user });
	return user;
}

export async function createSession(userId: number) {
	const id = randomBytes(32).toString('hex');
	await client`
		INSERT INTO sessions (id, user_id, expires_at)
		VALUES (${id}, ${userId}, now() + interval '14 days')
	`;
	return id;
}

export async function deleteSession(sessionId: string | undefined) {
	if (!sessionId) return;
	recentSessions.delete(sessionId);
	await client`DELETE FROM sessions WHERE id = ${sessionId}`;
}

let padding: string | null = null;

function paddingHash() {
	padding ??= hashPassword('padding-password');
	return padding;
}

const failures = new Map<string, { count: number; at: number }>();
const failureWindow = 15 * 60 * 1000;
const failureLimit = 8;

export function loginThrottled(email: string) {
	const hit = failures.get(email);
	if (!hit || Date.now() - hit.at > failureWindow) return false;
	return hit.count >= failureLimit;
}

export function loginFailed(email: string) {
	const hit = failures.get(email);
	if (!hit || Date.now() - hit.at > failureWindow) failures.set(email, { count: 1, at: Date.now() });
	else hit.count += 1;
}

export function loginSucceeded(email: string) {
	failures.delete(email);
}

export function sessionCookie(url: URL) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 14
	};
}

export async function authenticate(email: string, password: string, role: 'doctor' | 'patient') {
	if (loginThrottled(email)) return null;
	const user = await userByEmail(email);
	const ok = verifyPassword(password, user?.password_hash ?? paddingHash());
	if (!user || !ok || user.role !== role) {
		loginFailed(email);
		return null;
	}
	loginSucceeded(email);
	return user;
}
