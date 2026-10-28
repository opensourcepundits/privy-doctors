import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cameraRequest, devCameraBridge } from './dev-camera.ts';

function clinicAdapter() {
	const inner = adapter();
	return {
		...inner,
		vite: {
			...(inner.vite ?? {}),
			getRequest: cameraRequest
		}
	};
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		devCameraBridge(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: clinicAdapter()
		})
	]
});
