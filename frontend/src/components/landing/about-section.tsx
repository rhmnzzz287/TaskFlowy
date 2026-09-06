'use client'

import React from 'react'
import { Heart } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/context'

export function AboutSection() {
  const { t } = useTranslation()

  return (
    <section id="tentang" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-border">
      <div className="p-8 sm:p-12 bg-gradient-to-br from-surface to-surface-hi/50 border border-border rounded-3xl text-center relative overflow-hidden shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 text-primary">
          <Heart size={24} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {t.about.title}
        </h2>

        <div className="mt-6 text-sm sm:text-base text-muted leading-relaxed space-y-4 max-w-2xl mx-auto">
          <p>{t.about.p1}</p>
          <p>{t.about.p2}</p>
          <p className="font-medium text-text-primary">{t.about.p3}</p>
        </div>
      </div>
    </section>
  )
}
