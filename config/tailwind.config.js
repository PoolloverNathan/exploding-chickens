module.exports = {
  purge: [
      '../../templates/*.hbs',
      '../js/game/*.js',
      '../js/banner.js',
      '../js/home.js',
      '../services/socket-handler.js'
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      ringColor: ['responsive', 'dark', 'focus-within', 'focus', 'active'],
      ringOffsetColor: ['responsive', 'dark', 'focus-within', 'focus', 'active'],
      ringOffsetWidth: ['responsive', 'focus-within', 'focus', 'active'],
      ringOpacity: ['responsive', 'dark', 'focus-within', 'focus', 'active'],
      ringWidth: ['responsive', 'focus-within', 'focus', 'active'],
      outline: ['responsive', 'focus-within', 'focus', 'active'],
      zIndex: ['hover', 'active']
    },
  },
  plugins: [
      require('daisyui')
  ],
}
