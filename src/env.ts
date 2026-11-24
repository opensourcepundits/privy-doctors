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
	},
	DATA_KEK: {
		description: '32-byte key, base64 or hex, that wraps each patient chart key. Required in production.',
		schema: optional
	},
	KEYS_DATABASE_URL: {
		description:
			'Postgres URL for patient chart keys. Set this in the Vercel project environment. When unset, keys live in DATABASE_URL.',
		schema: optional
	}
});
