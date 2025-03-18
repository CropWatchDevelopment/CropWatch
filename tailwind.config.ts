import aspectRatio from '@tailwindcss/aspect-ratio';
import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import colors from 'tailwindcss/colors';
import svelteUx from 'svelte-ux/plugins/tailwind.cjs';
import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/svelte-ux/**/*.{svelte,js}',
	],

	ux: {
		themes: {
			"light": {
				"color-scheme": "light",
				"bg-primary-content": "lightgray",
				"primary": "oklch(60.39% 0.228 269.1)",
				"text-primary-content": "black",
				"secondary": "#7b92b2",
				"accent": "#67cba0",
				"neutral": "#181a2a",
				"neutral-content": "#edf2f7",
				"surface-100": "oklch(100% 0 0)",
				"surface-content": "#181a2a",
				"--rounded-box": "0.25rem",
				"--rounded-btn": ".125rem",
				"--rounded-badge": ".125rem",
				"--tab-radius": "0.25rem",
				"--animation-btn": "0",
				"--animation-input": "0",
				"--btn-focus-scale": "1"
			},
			"dark": {
				"color-scheme": "dark",
				"primary": "#1C4E80",
				"bg-primary-content": "#d9d9d9eb",
				"text-primary-content": "white",
				"secondary": "#7C909A",
				"accent": "#EA6947",
				"neutral": "#23282E",
				"surface-100": "#202020",
				"info": "#0091D5",
				"success": "#6BB187",
				"warning": "#DBAE59",
				"danger": "#AC3E31",
				"--rounded-box": "0.25rem",
				"--rounded-btn": ".125rem",
				"--rounded-badge": ".125rem"
			}
		},
	},

	plugins: [
		typography,
		forms,
		containerQueries,
		aspectRatio,
		svelteUx
	],
} satisfies Config;
