module.exports = {
    purge: [
        '../../templates/*.hbs',
        '../js/game/*.js',
        '../js/lobby/*.js',
        '../js/banner.js',
        '../js/home.js',
        '../services/socket-handler.js',
        '../services/event-actions.js'
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
    daisyui: {
        themes: [
            {
                'light': {
                    'primary' : '#8B5CF6',           /* Primary color */
                    'primary-focus' : '#7C3AED',     /* Primary color - focused */
                    'primary-content' : '#ffffff',   /* Foreground content color to use on primary color */

                    'secondary' : '#F59E0B',         /* Secondary color */
                    'secondary-focus' : '#D97706',   /* Secondary color - focused */
                    'secondary-content' : '#ffffff', /* Foreground content color to use on secondary color */

                    'accent' : '#10B981',            /* Accent color */
                    'accent-focus' : '#059669',      /* Accent color - focused */
                    'accent-content' : '#ffffff',    /* Foreground content color to use on accent color */

                    'neutral' : '#3d4451',           /* Neutral color */
                    'neutral-focus' : '#2a2e37',     /* Neutral color - focused */
                    'neutral-content' : '#ffffff',   /* Foreground content color to use on neutral color */

                    'base-100' : '#ffffff',          /* Base color of page, used for blank backgrounds */
                    'base-200' : '#f9fafb',          /* Base color, a little darker */
                    'base-300' : '#d1d5db',          /* Base color, even more darker */
                    'base-content' : '#1f2937',      /* Foreground content color to use on base color */

                    'info' : '#3B82F6',              /* Info */
                    'success' : '#10B981',           /* Success */
                    'warning' : '#F59E0B',           /* Warning */
                    'error' : '#EF4444',             /* Error */
                },
            },
        ],
    },
}
