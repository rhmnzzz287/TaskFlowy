/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-background)',
        surface: 'var(--bg-surface)',
        'surface-hi': 'var(--bg-surface-hi)',
        'surface-dim': 'var(--bg-surface-dim)',
        border: 'var(--border)',
        'border-lt': 'var(--border-lt)',
        'text-primary': 'var(--text-primary)',
        'text-dim': 'var(--text-dim)',
        muted: 'var(--text-muted)',
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