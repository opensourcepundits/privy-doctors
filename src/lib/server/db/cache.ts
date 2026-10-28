const TTL_MS = 20_000;
const MAX_ENTRIES = 200;

type Entry = { at: number; generation: number; data: unknown };
type Flight = { generation: number; promise: Promise<unknown> };

export function createQueryCache(
	run: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>
) {
	const store = new Map<string, Entry>();
	const inflight = new Map<string, Flight>();
	let generation = 0;

	function clear() {
		generation += 1;
		store.clear();
		inflight.clear();
	}

	function remember(key: string, generationAtStart: number, data: unknown) {
		if (generationAtStart !== generation) return;
		store.set(key, { at: Date.now(), generation, data });
		while (store.size > MAX_ENTRIES) {
			const oldest = store.keys().next().value;
			if (oldest === undefined) break;
			store.delete(oldest);
		}
	}

	async function query<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
		const text = strings.join(' ').replace(/\s+/g, ' ').trim();
		const key = cacheKey(text, values);
		const generationAtStart = generation;

		if (key) {
			const hit = store.get(key);
			if (hit && hit.generation === generation && Date.now() - hit.at < TTL_MS) {
				return structuredClone(hit.data) as T;
			}
			const pending = inflight.get(key);
			if (pending && pending.generation === generation) {
				return pending.promise.then((data) => structuredClone(data) as T);
			}
		}

		const promise = run(strings, ...values);
		let flight: Flight | undefined;
		if (key) {
			flight = { generation: generationAtStart, promise };
			inflight.set(key, flight);
		}

		try {
			const data = await promise;
			if (key && flight && inflight.get(key) === flight) inflight.delete(key);
			if (!key) clear();
			else remember(key, generationAtStart, data);
			return (key ? structuredClone(data) : data) as T;
		} catch (error) {
			if (key && flight && inflight.get(key) === flight) inflight.delete(key);
			throw error;
		}
	}

	return { query, clear };
}

function cacheKey(text: string, values: unknown[]) {
	if (!isRead(text)) return null;
	try {
		return `${text}\n${JSON.stringify(values)}`;
	} catch {
		return null;
	}
}

function isRead(text: string) {
	if (!/^(select|with)\b/i.test(text)) return false;
	if (/\b(insert|update|delete|alter|drop|truncate|create|grant|revoke)\b/i.test(text)) return false;
	if (/\bfor\s+update\b/i.test(text)) return false;
	if (/password_hash/i.test(text)) return false;
	// Session checks compare expires_at with now(), and a cached row would keep a signed-out user in.
	if (/\bnow\s*\(|\bsessions\b/i.test(text)) return false;
	return true;
}
