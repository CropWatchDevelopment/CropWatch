import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			regions: ['hnd1', 'kix1'], // Optional: Specify Vercel regions
			maxDuration: 300 // Set the maximum duration (in seconds)
		}),
		serviceWorker: {
			register: false // Let PWA plugin handle registration
		}
	},
	vitePlugin: {
		inspector: true
	}
};

export default config;
