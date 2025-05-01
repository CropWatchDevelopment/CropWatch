const colors = require('tailwindcss/colors');

module.exports = {
  // ...
  ux: {
    themes: {
      light: {
        primary: colors['orange']['500'],
        'primary-content': 'white',
        secondary: colors['blue']['500'],
        'surface-100': 'white',
        'surface-200': colors['gray']['100'],
        'surface-300': colors['gray']['300'],
        'surface-content': colors['gray']['900'],
      },
      dark: {
        primary: colors['orange']['500'],
        'primary-content': 'white',
        secondary: colors['blue']['500'],
        'surface-100': colors['zinc']['800'],
        'surface-200': colors['zinc']['900'],
        'surface-300': colors['zinc']['950'],
        'surface-content': colors['zinc']['100'],
      },
    },
  },
};