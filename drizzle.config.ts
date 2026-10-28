import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error('Set DATABASE_URL_UNPOOLED for Neon migrations, or DATABASE_URL for local Postgres.');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url },
	verbose: true,
	strict: true
});
