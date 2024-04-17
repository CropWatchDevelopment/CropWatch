const colors = require('tailwindcss/colors');
const svelteUx = require('svelte-ux/plugins/tailwind.cjs');

module.exports = {
  content: [
    './src/**/*.{html,svelte}', 
    './node_modules/svelte-ux/**/*.{svelte,js}'
  ],

  // See customization docs: https://svelte-ux.techniq.dev/customization
  ux: {
    themes: require('./themes.json')
    ,
  },

  plugins: [
    svelteUx({ colorSpace: 'oklch' }),  // uses hsl() color space by default. To use oklch(), use: svelteUx({ colorSpace: 'oklch' }),
  ]
};

// {
//   "light": {
//     "color-scheme": "light",
//     "primary": "#055817",
//     "secondary": "#0DBF34",
//     "secondary-content": "oklch(98.71% 0.0106 342.55)",
//     "accent": "#8EF4FF",
//     "neutral": "#242327",
//     "neutral-content": "#D7DDE4",
//     "surface-100": "#FFFEF4",
//     "surface-200": "#F2F2F2",
//     "surface-300": "#E5E6E6",
//     "surface-content": "#1f2937",
//     "success": "#62ef98",
//     "warning": "#f9ffa3",
//     "danger": "#ff8f8f",
//     "info": "#7a95ff"
//   },
//   "dark": {
//     "color-scheme": "dark",
//     "primary": "#055817",
//     "secondary": "#0DBF34",
//     "accent": "#8EF4FF",
//     "neutral": "#FFFEF4",
//     "neutral-content": "#A6ADBB",
//     "surface-100": "#242327",
//     "surface-200": "#191e24",
//     "surface-300": "#15191e",
//     "surface-content": "#A6ADBB",
//     "success": "#62ef98",
//     "warning": "#f9ffa3",
//     "danger": "#ff8f8f",
//     "info": "#7a95ff"
//   }
// }
