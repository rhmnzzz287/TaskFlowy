/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-background) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        'surface-hi': 'rgb(var(--bg-surface-hi) / <alpha-value>)',
        'surface-dim': 'rgb(var(--bg-surface-dim) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-lt': 'rgb(var(--border-lt) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-dim': 'rgb(var(--text-dim) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
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
