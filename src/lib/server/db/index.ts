import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL } from '$app/env/private';
import * as schema from './schema';

export function databaseUrl() {
	const url = DATABASE_URL || POSTGRES_URL || DATABASE_URL_UNPOOLED;
	if (!url) {
		throw new Error('Set DATABASE_URL. The Vercel Neon integration provides the pooled connection string.');
	}
	return url;
}

function options(url: string): postgres.Options<Record<string, never>> {
	const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
	return {
		prepare: false,
		max: local ? 10 : 1,
		idle_timeout: 20,
		connect_timeout: 10,
		...(local ? { ssl: false } : url.includes('sslmode=') ? {} : { ssl: 'require' })
	};
}

const url = databaseUrl();

export const client = postgres(url, options(url));

export const db = drizzle(client, { schema });
