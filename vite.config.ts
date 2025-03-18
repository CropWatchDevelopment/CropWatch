import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' }),
	sveltekit(),
	],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
