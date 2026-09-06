'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n/context'

export function FreedomMatrix() {
  const { t } = useTranslation()

  return (
    <section id="kebebasan" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t.matrix.badge}</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">
          {t.matrix.title}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t.matrix.subtitle}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-border rounded-2xl bg-surface shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-hi/40">
              <th className="p-4 font-semibold text-muted w-1/4">{t.matrix.colCriteria}</th>
              <th className="p-4 font-bold text-primary bg-primary/5 w-1/3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>TaskFlowy</span>
                </div>
              </th>
              <th className="p-4 font-semibold text-text-primary w-1/5">{t.matrix.colExcel}</th>
              <th className="p-4 font-semibold text-text-primary w-1/5">{t.matrix.colJira}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {t.matrix.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-surface-hi/20 transition-colors">
                <td className="p-4 font-medium text-text-primary">{row.criteria}</td>
                <td className="p-4 font-semibold text-primary bg-primary/10">{row.taskflowy}</td>
                <td className="p-4 text-text-dim">{row.excel}</td>
                <td className="p-4 text-text-dim">{row.jira}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
