module.exports = {
    purge: [
        '../../templates/*.hbs',
        '../js/*.js',
        '../js/game/*.js',
        '../js/lobby/*.js',
        '../../services/socket-handler.js',
        '../../services/event-actions.js'
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
                    "primary": "#570df8",
                    "primary-focus": "#4506cb",
                    "primary-content": "#ffffff",

                    "secondary": "#f000b8",
                    "secondary-focus": "#bd0091",
                    "secondary-content": "#ffffff",

                    "accent": "#10B981",
                    "accent-focus": "#2aa79b",
                    "accent-content": "#ffffff",

                    "neutral": "#3d4451",
                    "neutral-focus": "#2a2e37",
                    "neutral-content": "#ffffff",

                    "base-100": "#ffffff",
                    "base-200": "#f9fafb",
                    "base-300": "#d1d5db",
                    "base-content": "#1f2937",

                    'info' : '#3B82F6',              /* Info */
                    'success' : '#10B981',           /* Success */
                    'warning' : '#F59E0B',           /* Warning */
                    'error' : '#EF4444',             /* Error */
                },
                'dark': {
                    "primary": "#793ef9",
                    "primary-focus": "#570df8",
                    "primary-content": "#ffffff",

                    "secondary": "#f000b8",
                    "secondary-focus": "#bd0091",
                    "secondary-content": "#ffffff",

                    "accent": "#10B981",
                    "accent-focus": "#2aa79b",
                    "accent-content": "#ffffff",

                    "neutral": "#2a2e37",
                    "neutral-focus": "#16181d",
                    "neutral-content": "#ffffff",

                    "base-100": "#3d4451",
                    "base-200": "#2a2e37",
                    "base-300": "#16181d",
                    "base-content": "#ebecf0",

                    'info' : '#3B82F6',              /* Info */
                    'success' : '#10B981',           /* Success */
                    'warning' : '#F59E0B',           /* Warning */
                    'error' : '#EF4444',             /* Error */
                },
            },
        ],
    },
}
