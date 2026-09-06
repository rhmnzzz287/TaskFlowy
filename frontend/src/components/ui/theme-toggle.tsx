'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const KEY = 'taskflowy-theme'

function getInitial(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    setTheme(getInitial())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-text-primary hover:bg-surface-hi/40 transition-colors"
      aria-label="Toggle color theme"
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}