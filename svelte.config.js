import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Node 20 has no native WebSocket, which @supabase/realtime-js requires at
		// client-construction time — server-side `createClient()` throws on it.
		// Keep this in sync with `engines.node` in package.json.
		adapter: adapter({ runtime: 'nodejs22.x' }),
		serviceWorker: {
			register: false
		}
	},
	vitePlugin: {
		inspector: {
			toggleKeyCombo: 'alt-x'
		}
	}
};

export default config;
