'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { useTranslation } from '@/lib/i18n/context'

export function LandingFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border bg-surface-hi/20 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Call to Action Banner */}
        <div className="max-w-xl mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
            {t.footer.ctaTitle}
          </h3>
          <p className="text-xs sm:text-sm text-muted mt-2">
            {t.footer.ctaSubtitle}
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              href="/app"
              className="btn-primary text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <span>{t.footer.ctaButton}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Minimalist Footnote */}
        <div className="pt-8 border-t border-border w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Logo size={20} wordmarkClassName="text-[13px]" />
            <span>{t.footer.tagline}</span>
          </div>
          <p>{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
