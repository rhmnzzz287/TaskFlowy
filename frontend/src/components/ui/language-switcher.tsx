'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n/context'
import { Globe } from 'lucide-react'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useTranslation()

  const toggleLocale = () => {
    setLocale(locale === 'id' ? 'en' : 'id')
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`btn-secondary text-[11px] h-7 px-2 gap-1.5 font-semibold transition-all ${className}`}
      title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      aria-label="Switch Language"
    >
      <Globe size={13} className="text-primary" />
      <span className="uppercase tracking-wider">{locale}</span>
    </button>
  )
}
