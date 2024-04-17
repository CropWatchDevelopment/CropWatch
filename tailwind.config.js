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
      light: {
        "color-scheme": "light",
        primary: "#055817",
        secondary: "#0DBF34",
        "accent": "#8EF4FF",
        "neutral": "#242327",
        "info": "#7a95ff",
        "success": "#62ef98",
        "warning": "#f9ffa3",
        "danger": "#ff8f8f",
        "surface-100": "#FFFEF4",
        "surface-200": "#F2F2F2",
        "surface-300": "#E5E6E6"
      },
      dark: {
        "color-scheme": "dark",
        primary: "#055817",
        secondary: "#0DBF34",
        "accent": "#8EF4FF",
        "neutral": "#FFFEF4",
        "info": "#7a95ff",
        "success": "#62ef98",
        "warning": "#f9ffa3",
        "danger": "#ff8f8f",
        "surface-100": "#242327",
        "surface-200": "#191e24",
        "surface-300": "#15191e"
        }
      }
    },
  },

  plugins: [
    svelteUx,  // uses hsl() color space by default. To use oklch(), use: svelteUx({ colorSpace: 'oklch' }),
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
