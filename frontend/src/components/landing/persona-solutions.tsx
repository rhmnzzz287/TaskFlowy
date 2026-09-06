'use client'

import React, { useState } from 'react'
import { Store, Briefcase, AlertCircle, Printer, FileSpreadsheet, Share2, Zap } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/context'

export function PersonaSolutions() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'umkm' | 'pm'>('umkm')

  return (
    <section id="solusi" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {t.solutions.title}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t.solutions.subtitle}
        </p>
      </div>

      {/* Switcher Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 rounded-xl bg-surface-hi border border-border">
          <button
            onClick={() => setActiveTab('umkm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'umkm'
                ? 'bg-surface text-primary shadow-xs border border-border/80'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            <Store size={15} />
            <span>{t.solutions.tabUmkm}</span>
          </button>

          <button
            onClick={() => setActiveTab('pm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pm'
                ? 'bg-surface text-primary shadow-xs border border-border/80'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            <Briefcase size={15} />
            <span>{t.solutions.tabPm}</span>
          </button>
        </div>
      </div>

      {/* Solution Detail Content */}
      {activeTab === 'umkm' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-5 p-6 bg-surface border border-border rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {t.solutions.umkmBadge}
              </span>
              <h3 className="text-xl font-bold text-text-primary mt-3">
                {t.solutions.umkmTitle}
              </h3>
              <div className="mt-4 space-y-3 text-xs text-muted">
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{t.solutions.umkmProblem1}</span>
                </div>
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{t.solutions.umkmProblem2}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-text-primary font-medium italic">
                {t.solutions.umkmQuote}
              </p>
            </div>
          </div>

          <div className="md:col-span-7 p-6 bg-surface-hi/30 border border-border rounded-2xl flex flex-col justify-between">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              {t.solutions.tabUmkm}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Zap size={18} className="text-primary mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.umkmFeature1Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.umkmFeature1Desc}</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Printer size={18} className="text-emerald-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.umkmFeature2Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.umkmFeature2Desc}</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Share2 size={18} className="text-blue-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.umkmFeature3Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.umkmFeature3Desc}</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <FileSpreadsheet size={18} className="text-purple-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.umkmFeature4Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.umkmFeature4Desc}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-5 p-6 bg-surface border border-border rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {t.solutions.pmBadge}
              </span>
              <h3 className="text-xl font-bold text-text-primary mt-3">
                {t.solutions.pmTitle}
              </h3>
              <div className="mt-4 space-y-3 text-xs text-muted">
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{t.solutions.pmProblem1}</span>
                </div>
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{t.solutions.pmProblem2}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-text-primary font-medium italic">
                {t.solutions.pmQuote}
              </p>
            </div>
          </div>

          <div className="md:col-span-7 p-6 bg-surface-hi/30 border border-border rounded-2xl flex flex-col justify-between">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              {t.solutions.tabPm}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Zap size={18} className="text-primary mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.pmFeature1Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.pmFeature1Desc}</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Share2 size={18} className="text-emerald-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.pmFeature2Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.pmFeature2Desc}</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <Printer size={18} className="text-blue-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.pmFeature3Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.pmFeature3Desc}</p>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-xl">
                <FileSpreadsheet size={18} className="text-purple-500 mb-2" />
                <h5 className="text-xs font-bold text-text-primary">{t.solutions.pmFeature4Title}</h5>
                <p className="text-[11px] text-muted mt-1">{t.solutions.pmFeature4Desc}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
