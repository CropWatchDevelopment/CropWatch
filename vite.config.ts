import { paraglideVitePlugin } from '@inlang/paraglide-js';
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { paraglideConfig } from './paraglide.config.js';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			// Node 20 has no native WebSocket, which @supabase/realtime-js requires at
			// client-construction time — server-side `createClient()` throws on it.
			// Keep this in sync with `engines.node` in package.json.
			adapter: adapter({ runtime: 'nodejs24.x' }),
			// The service worker is registered by the PWA dock (production builds only).
			serviceWorker: {
				register: false
			},
			// Installed apps stay open for days: check for a new deploy every few
			// minutes so the dock can offer a reload (`updated` in $app/state).
			version: {
				pollInterval: 5 * 60 * 1000
			},
			inspector: {
				toggleKeyCombo: 'alt-x'
			}
		}),
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
