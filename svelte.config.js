import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: { adapter: adapter() },
    vitePlugin: {
        inspector: {
            toggleKeyCombo: 'alt-x'
        }
    }
};

export default config;
