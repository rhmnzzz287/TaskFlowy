'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Logo } from '@/components/ui/logo'
import { useTranslation } from '@/lib/i18n/context'

export function LandingNavbar() {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={28} wordmarkClassName="text-base" />
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={12} /> {t.navbar.freeBadge}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-muted font-medium">
          <a href="#playground" className="hover:text-text-primary transition-colors">{t.navbar.tryLive}</a>
          <a href="#solusi" className="hover:text-text-primary transition-colors">{t.navbar.solutions}</a>
          <a href="#kebebasan" className="hover:text-text-primary transition-colors">{t.navbar.freedom}</a>
          <a href="#tentang" className="hover:text-text-primary transition-colors">{t.navbar.about}</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/app"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
          >
            <span>{t.navbar.openWorkbench}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  )
}
