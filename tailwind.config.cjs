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
      "light": {
        "color-scheme": "light",
        "primary": "#45AEEE",
        "secondary": "#E8488A",
        "accent": "#FFF232",
        "neutral": "#1a1a1a",
        "surface-100": "oklch(100% 0 0)",
        "info": "#4AA8C0",
        "success": "#823290",
        "warning": "#EE8133",
        "danger": "#E93F33"
      },
      "dark": {
        "color-scheme": "dark",
        "primary": "#1C4E80",
        "secondary": "#7C909A",
        "accent": "#EA6947",
        "neutral": "#23282E",
        "surface-100": "hsl(0 0% 21.1765%)",
        "surface-200": "hsl(0 0% 12.9412%)",
        "surface-300": "hsl(0 6.6667% 5.8824%)",
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
    svelteUx,  // uses hsl() color space by default. To use oklch(), use: svelteUx({ colorSpace: 'oklch' }),
  ]
};
