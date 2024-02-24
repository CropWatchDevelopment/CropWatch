const colors = require('tailwindcss/colors');
const svelte_ux = require('svelte-ux/plugins/tailwind.cjs');

/** @type {import('tailwindcss').Config}*/
const config = {
	content: [
		'./src/**/*.{html,svelte}',
		'./node_modules/svelte-ux/**/*.{svelte,js}'
	],
	ux: {
		themes: {
			"light": {
			  "color-scheme": "light",
			  "primary": "rgb(4 120 87)",
			  "secondary": "rgb(12 4 124)",
			  "secondary-content": "oklch(98.71% 0.0106 342.55)",
			  "accent": "rgb(0 122 110)",
			  "neutral": "#2B3440",
			  "neutral-content": "#D7DDE4",
			  "surface-100": "rgb(224 224 224)",
			  "surface-200": "#F2F2F2",
			  "surface-300": "#E5E6E6",
			  "surface-content": "#1f2937"
			},
			"dark": {
			  "color-scheme": "dark",
			  "primary": "rgb(4 104 124)",
			  "secondary": "rgb(4 66 124)",
			  "accent": "rgb(0 122 24)",
			  "neutral": "#2a323c",
			  "neutral-content": "#A6ADBB",
			  "surface-100": "rgb(34 38 43)",
			  "surface-200": "#191e24",
			  "surface-300": "#15191e",
			  "surface-content": "#A6ADBB"
			}
		  },
	},
	variants: {
		extend: {}
	},
	plugins: [svelte_ux]
};

module.exports = config;
