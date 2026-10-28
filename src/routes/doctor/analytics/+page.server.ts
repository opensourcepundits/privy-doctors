import { analytics } from '#lib/server/clinic';

export function load() {
	return { report: analytics() };
}
