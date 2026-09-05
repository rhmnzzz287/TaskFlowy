/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        surface: '#1E293B',
        'surface-hi': '#283044',
        'surface-dim': '#0B1326',
        border: '#334155',
        'border-lt': '#E2E8F0',
        'text-primary': '#DAE2FD',
        'text-dim': '#C7C4D8',
        muted: '#64748B',
        primary: '#4F46E5',
        'primary-hover': '#6366F1',
        'primary-tint': '#C3C0FF',
        secondary: '#0D9488',
        'secondary-alt': '#14B8A6',
        critical: '#EA580C',
        milestone: '#7C3AED',
        completed: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
}