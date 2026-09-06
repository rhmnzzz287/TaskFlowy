'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { TranslationDictionary } from './dict-schema'
import { idDict } from './id'
import { enDict } from './en'

export type Locale = 'id' | 'en'

const STORAGE_KEY = 'taskflowy_locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationDictionary
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved === 'id' || saved === 'en') {
        setLocaleState(saved)
      } else if (typeof navigator !== 'undefined') {
        const navLang = navigator.language?.toLowerCase() || ''
        if (navLang.startsWith('en')) {
          setLocaleState('en')
        }
      }
    } catch {
      // localStorage may be disabled in private browsing
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // ignore
    }
  }, [])

  const t = locale === 'en' ? enDict : idDict

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    return {
      locale: 'id',
      setLocale: () => {},
      t: idDict,
    }
  }
  return ctx
}
