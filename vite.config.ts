import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' }),
		sveltekit(),
	],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
