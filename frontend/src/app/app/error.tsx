'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { reportError } from '@/lib/telemetry'
import { ClearCacheButton } from '@/components/ui/widget-error-boundary'

/**
 * Workbench route fail-safe (Next.js App Router convention). Catches render
 * errors inside /app and offers recovery without losing the whole session.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, 'error')
  }, [error])

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4">
      <div role="alert" className="max-w-md w-full text-center bg-surface border border-border rounded-2xl shadow-xl p-8">
        <div className="mx-auto w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-error" aria-hidden="true" />
        </div>
        <h1 className="text-text-primary text-[17px] font-bold mb-2">Something went wrong</h1>
        <p className="text-muted text-[13px] leading-relaxed mb-1">
          The workbench hit an unexpected error. Your autosaved drafts are stored locally and safe.
        </p>
        <p className="text-muted text-[11px] font-mono mb-5">
          {error.digest ? `Error ref: ${error.digest}` : 'No error reference available'}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-[11px] font-mono text-error bg-error/10 border border-error/30 rounded-lg p-3 mb-5 max-h-40 overflow-auto whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        )}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button type="button" onClick={reset} className="btn-primary">
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
            Reload app
          </button>
          <ClearCacheButton />
        </div>
      </div>
    </div>
  )
}
