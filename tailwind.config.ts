// import type { Config } from 'tailwindcss';

// export default {
// 	content: ['./src/**/*.{html,js,svelte,ts}'],

// 	theme: {
// 		extend: {}
// 	},

// 	plugins: [require('@tailwindcss/typography')]
// } as Config;

const colors = require('tailwindcss/colors');
const svelteUx = require('svelte-ux/plugins/tailwind.cjs');

module.exports = {
  content: [
    './src/**/*.{html,svelte}', 
    './node_modules/svelte-ux/**/*.{svelte,js}'
  ],

  // See customization docs: https://svelte-ux.techniq.dev/customization
  ux: {
    themes: {
      // light: {
      //   primary: colors['orange']['500'],
      //   'primary-content': 'white',
      //   secondary: colors['blue']['500'],
      //   'surface-100': 'white',
      //   'surface-200': colors['gray']['100'],
      //   'surface-300': colors['gray']['300'],
      //   'surface-content': colors['gray']['900'],
      //   'color-scheme': 'light'
      // },
      // dark: {
      //   primary: colors['orange']['500'],
      //   'primary-content': 'white',
      //   secondary: colors['blue']['500'],
      //   'surface-100': colors['zinc']['800'],
      //   'surface-200': colors['zinc']['900'],
      //   'surface-300': colors['zinc']['950'],
      //   'surface-content': colors['zinc']['100'],
      //   'color-scheme': 'dark'
      // },
        "light": {
          "color-scheme": "light",
          "primary": "#5E81AC",
          "secondary": "#81A1C1",
          "accent": "#88C0D0",
          "neutral": "#4C566A",
          "neutral-content": "#D8DEE9",
          "surface-100": "#ECEFF4",
          "surface-200": "#E5E9F0",
          "surface-300": "#D8DEE9",
          "surface-content": "#2E3440",
          "info": "#B48EAD",
          "success": "#A3BE8C",
          "warning": "#EBCB8B",
          "danger": "#BF616A",
          "--rounded-box": "0.4rem",
          "--rounded-btn": "0.2rem",
          "--rounded-badge": "0.4rem",
          "--tab-radius": "0.2rem"
        },
        "dark": {
          "color-scheme": "dark",
          "primary": "#1C4E80",
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
    svelteUx({ colorSpace: 'oklch' }),  // uses hsl() color space by default. To use oklch(), use: svelteUx({ colorSpace: 'oklch' }),
  ]
};
