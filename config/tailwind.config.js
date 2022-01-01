module.exports = {
    purge: [
        '../../templates/*.hbs',
        '../../templates/partials/*.hbs',
        '../../templates/partials/sidebar/*.hbs',
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
            ringColor: ['responsive', 'hover', 'focus', 'active'],
            ringOffsetColor: ['responsive', 'hover', 'focus', 'active'],
            ringOffsetWidth: ['responsive', 'hover', 'focus', 'active'],
            ringOpacity: ['responsive', 'hover', 'focus', 'active'],
            ringWidth: ['responsive', 'hover', 'focus', 'active'],
            outline: ['responsive', 'hover', 'focus', 'active'],
            zIndex: ['responsive', 'hover', 'focus', 'active']
        },
    },
    plugins: [
        require('daisyui')
    ],
    daisyui: {
        themes: [
            {
                'light': {
                    "primary": "#FBBF24", // Primary theme color (logo, buttons)
                    "primary-focus": "#F59E0B",
                    "primary-content": "#ffffff",

                    "secondary": "#8B5CF6", // Secondary theme color (alt icons)
                    "secondary-focus": "#7C3AED",
                    "secondary-content": "#ffffff",

                    "accent": "#EC4899", // Tertiary theme color (alt icons)
                    "accent-focus": "#DB2777",
                    "accent-content": "#ffffff",

                    "neutral": "#9CA3AF", // Muted theme color (alt buttons)
                    "neutral-focus": "#6B7280",
                    "neutral-content": "#ffffff",

                    "base-100": "#ffffff", // Base background, primary
                    "base-200": "#f9fafb", // Base background, secondary
                    "base-300": "#d1d5db", // Base background, tertiary
                    "base-content": "#374151", // Base opposing color, used in elements (like text) on background

                    "info": "#3B82F6",
                    "success": "#10B981",
                    "warning": "#FBBF24",
                    "error": "#EF4444",
                },
                'dark': {
                    "primary": "#FBBF24", // Primary theme color (logo, buttons)
                    "primary-focus": "#F59E0B",
                    "primary-content": "#ffffff",

                    "secondary": "#8B5CF6", // Secondary theme color (alt icons)
                    "secondary-focus": "#7C3AED",
                    "secondary-content": "#ffffff",

                    "accent": "#EC4899", // Tertiary theme color (alt icons)
                    "accent-focus": "#DB2777",
                    "accent-content": "#ffffff",

                    "neutral": "#9CA3AF", // Muted theme color (alt buttons)
                    "neutral-focus": "#6B7280",
                    "neutral-content": "#ffffff",

                    "base-100": "#3d4451", // Base background, primary
                    "base-200": "#2a2e37", // Base background, secondary
                    "base-300": "#16181d", // Base background, tertiary
                    "base-content": "#ebecf0", // Base opposing color, used in elements (like text) on background

                    "info": "#3B82F6",
                    "success": "#10B981",
                    "warning": "#FBBF24",
                    "error": "#EF4444",
                },
            },
        ],
    },
}
