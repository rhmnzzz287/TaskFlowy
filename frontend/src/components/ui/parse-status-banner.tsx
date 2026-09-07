'use client'

import { Info, Loader2, CheckCircle2, AlertTriangle, XCircle, Inbox } from 'lucide-react'

export type ParseStatus = 'idle' | 'parsing' | 'success' | 'partial' | 'error' | 'empty'

interface ParseStatusBannerProps {
  status: ParseStatus
  accepted: number
  rejected: number
}

export function ParseStatusBanner({ status, accepted, rejected }: ParseStatusBannerProps) {
  if (status === 'parsing') {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="bg-primary/10 border-b border-primary/30 px-3 py-2 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-primary shrink-0" aria-hidden="true" />
        <p className="text-text-primary text-[12px]">
          <span className="font-semibold">Parsing…</span>{' '}
          <span className="text-muted">Reading rows and building your timeline.</span>
        </p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div role="status" aria-live="polite" className="bg-emerald-500/10 border-b border-emerald-500/30 px-3 py-2 flex items-center gap-2">
        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
        <p className="text-text-primary text-[12px]">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Timeline generated.</span>{' '}
          <span className="text-muted">{accepted} task{accepted === 1 ? '' : 's'} accepted — verify dates in the review list.</span>
        </p>
      </div>
    )
  }

  if (status === 'partial') {
    return (
      <div role="status" aria-live="polite" className="bg-warning/10 border-b border-warning/30 px-3 py-2 flex items-center gap-2">
        <AlertTriangle size={14} className="text-warning shrink-0" aria-hidden="true" />
        <p className="text-text-primary text-[12px]">
          <span className="font-semibold text-warning">Partially parsed:</span>{' '}
          <span className="font-mono font-semibold">{accepted} accepted</span>
          <span className="text-muted"> · </span>
          <span className="font-mono font-semibold">{rejected} rejected</span>
          <span className="text-muted"> — valid rows are shown below; fix the highlighted rows, then Generate again.</span>
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div role="alert" aria-live="assertive" className="bg-error/10 border-b border-error/30 px-3 py-2 flex items-start gap-2">
        <XCircle size={14} className="text-error shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-[12px]">
          <p className="text-error font-semibold">Couldn&apos;t build a timeline.</p>
          <p className="text-text-primary mt-0.5">
            {rejected > 0
              ? `${rejected} row${rejected === 1 ? '' : 's'} failed — nothing valid to show yet.`
              : 'Nothing valid to show yet.'}{' '}
            <span className="text-muted">How to recover: give each row a task name plus a start date or duration, then press Generate again.</span>
          </p>
        </div>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div role="status" aria-live="polite" className="bg-surface border-b border-border px-3 py-2 flex items-center gap-2" data-hydro-probe="static-svg">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
        <p className="text-[12px] text-muted">No valid tasks found — add at least one row with a task name to get started.</p>
      </div>
    )
  }

  // idle — ready to generate
  return (
    <div role="status" aria-live="polite" className="bg-surface border-b border-border px-3 py-2 flex items-center gap-2">
      <Info size={14} className="text-primary shrink-0" aria-hidden="true" />
      <p className="text-[12px] text-muted">
        Ready to generate{accepted > 0 ? <> — <span className="font-mono text-text-primary">{accepted} row{accepted === 1 ? '' : 's'}</span> with task names</> : ''}.
        Press Generate Timeline when your rows look right.
      </p>
    </div>
  )
}
