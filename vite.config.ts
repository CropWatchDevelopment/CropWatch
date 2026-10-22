import { paraglideVitePlugin } from '@inlang/paraglide-js';
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideConfig } from './paraglide.config.js';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		// Options (incl. the required outputStructure: 'locale-modules') live in
		// paraglide.config.js so this and scripts/generate-paraglide.mjs stay in sync.
		paraglideVitePlugin(paraglideConfig)
	],
	test: {
		expect: { requireAssertions: true },
		// Only written when CI passes `--coverage`; lcov.info is what Qlty reads.
		// Generated output (paraglide, svelte-kit) is excluded because it is
		// gitignored, so Qlty cannot match those paths against the repository.
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			// Every source file counts, tested or not: an untested file reports 0%
			// instead of being left out of the total.
			include: ['src/**/*.{ts,svelte}'],
			exclude: [
				...coverageConfigDefaults.exclude,
				'src/lib/paraglide/**',
				'.svelte-kit/**',
				// The test kit is test code, not app code.
				'src/lib/testing/**'
			],
			// The project's floor: a coverage run (CI, `pnpm test:coverage`) fails below it.
			thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./src/lib/testing/setup.ts']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./src/lib/testing/setup.ts']
				}
			}
		]
	}
});
