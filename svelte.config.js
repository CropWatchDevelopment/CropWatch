import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
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
		}
	},
	vitePlugin: {
		inspector: {
			toggleKeyCombo: 'alt-x'
		}
	}
};

export default config;
