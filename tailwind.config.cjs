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
        "primary": "hsl(215.4061 100% 50%)",
        "secondary": "hsl(0 0% 0%)",
        "accent": "hsl(310.4132 49.3878% 51.9608%)",
        "neutral": "hsl(217.0213 92.1569% 10%)",
        "info": "hsl(191.5385 92.8571% 78.0392%)",
        "success": "hsl(181.5 46.5116% 66.2745%)",
        "warning": "hsl(32.3077 61.9048% 83.5294%)",
        "danger": "hsl(0 63.3803% 72.1569%)",
        "surface-100": "hsl(217.5 26.6667% 94.1176%)",
        "surface-200": "hsl(218.5714 42.4242% 87.0588%)",
        "surface-300": "hsl(218.7342 67.5214% 77.0588%)",
        "surface": "hsl(0 0% 0%)"
      },






      "dark": {
        "color-scheme": "dark",
        "primary": "#1C4E80",
        "secondary": "#7C909A",
        "accent": "#EA6947",
        "neutral": "#23282E",
        "surface-100": "hsl(0 0% 21.1765%)", // Background
        "surface-200": "hsl(0 0% 12.9412%)", // Card Background
        "surface-300": "hsl(0 6.6667% 5.8824%)", // Sidenav Background
        "info": "#0091D5",
        "success": "#6BB187",
        "warning": "#DBAE59",
        "danger": "#AC3E31",
        "--rounded-box": "0.25rem",
        "--rounded-btn": ".125rem",
        "--rounded-badge": ".125rem",
        "surface": "hsl(0 0% 100%)"
      }
    },
  },

  plugins: [
    svelteUx,  // uses hsl() color space by default. To use oklch(), use: svelteUx({ colorSpace: 'oklch' }),
  ]
};
