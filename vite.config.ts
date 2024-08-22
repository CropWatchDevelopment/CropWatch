import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'my-sw.js', // or `my-sw.ts`
			/* other pwa options */
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
