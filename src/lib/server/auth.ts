import { randomBytes } from 'node:crypto';
import { client } from './db';

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
