import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL } from '$app/env/private';
import { createQueryCache } from './cache';
import * as schema from './schema';

export interface ClinicSql {
	<T = Record<string, unknown>[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
	begin<T>(fn: (sql: ClinicSql) => Promise<T>): Promise<T>;
}

export function databaseUrl() {
	const url = DATABASE_URL || POSTGRES_URL || DATABASE_URL_UNPOOLED;
	if (!url) {
		throw new Error('Set DATABASE_URL. The Vercel Neon integration provides the pooled connection string.');
	}
	return url;
}

function localDatabase(url: string) {
	return /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
}

function postgresOptions(url: string): postgres.Options<Record<string, never>> {
	const local = localDatabase(url);
	return {
		prepare: false,
		max: local ? 10 : 1,
		idle_timeout: local ? 20 : 10,
		connect_timeout: 10,
		...(local ? { ssl: false } : { ssl: 'require' })
	};
}

function tcpUrl(url: string) {
	if (localDatabase(url)) return url;
	const parsed = new URL(url);
	parsed.searchParams.delete('channel_binding');
	return parsed.toString();
}

// Vercel freezes the function between clicks, which drops a TCP connection to Neon.
// The next page then waits while that connection is opened again. HTTPS queries do not keep a socket.
function neonDatabase(url: string) {
	const http = neon(url, { fetchOptions: { cache: 'no-store' } });
	// Repeated reads stay in this process for 20 seconds. Any write drops them.
	const cache = createQueryCache((strings, ...values) => http(strings, ...values));
	let writer: postgres.Sql | undefined;
	const query = (<T>(strings: TemplateStringsArray, ...values: unknown[]) => cache.query<T>(strings, ...values)) as ClinicSql;
	query.begin = async (fn) => {
		try {
			writer ??= postgres(tcpUrl(url), postgresOptions(url));
			return await writer.begin(fn as never);
		} finally {
			cache.clear();
		}
	};
	return { query, http };
}

const url = databaseUrl();
const local = localDatabase(url) ? postgres(url, postgresOptions(url)) : null;
const remote = local ? null : neonDatabase(url);

export const client: ClinicSql = local ? (local as unknown as ClinicSql) : remote!.query;

export const db = local ? drizzlePostgres(local, { schema }) : drizzleNeon(remote!.http, { schema });
