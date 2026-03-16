import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
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
