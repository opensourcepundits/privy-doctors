import { defineEnvVars } from '@sveltejs/kit/env';

function optional(value: string | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Pooled Neon connection string. The Vercel Neon integration sets this. Locally it points at Docker Postgres.',
		schema: optional
	},
	DATABASE_URL_UNPOOLED: {
		description: 'Direct Neon connection string for migrations. Set by the Vercel Neon integration.',
		schema: optional
	},
	POSTGRES_URL: {
		description: 'Legacy pooled URL also set by the Vercel Neon integration.',
		schema: optional
	}
});
