/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                cobalt: {
                    primary: '#1E40AF',
                    deep: '#1E3A8A',
                    light: '#3B82F6',
                },
                bg: {
                    white: '#FFFFFF',
                    soft: '#F9FAFB',
                },
                text: {
                    main: '#111827',
                    muted: '#6B7280',
                }
            },
            backgroundImage: {
                'blueprint': "linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)",
            }
        },
    },
    plugins: [],
}
