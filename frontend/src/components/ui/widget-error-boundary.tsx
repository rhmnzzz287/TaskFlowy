'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { reportError } from '@/lib/telemetry'

interface WidgetErrorBoundaryProps {
  /** Shown in the fallback title, e.g. "Gantt chart". */
  name: string
  children: ReactNode
  /** Optional extra class for the fallback container sizing. */
  className?: string
}

interface WidgetErrorBoundaryState {
  error: Error | null
  errorId: string | null
}

/**
 * Widget-level fail-safe: a crash in one workspace widget (Gantt, table,
 * dependency graph, review list) degrades to an inline fallback instead of
 * blanking the entire workbench. Offers retry (re-mount children) and
 * reports to telemetry with widget context.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  state: WidgetErrorBoundaryState = { error: null, errorId: null }

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error) {
    const errorId = reportError(error, 'error')
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error(`[WidgetErrorBoundary:${this.props.name}]`, error)
    this.setState({ errorId })
  }

  private retry = () => this.setState({ error: null, errorId: null })

  render() {
    const { error, errorId } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        className={`flex-1 flex items-center justify-center p-6 bg-surface-dim/50 ${this.props.className ?? ''}`}
      >
        <div className="max-w-sm text-center">
          <div className="mx-auto w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center mb-3">
            <AlertTriangle size={18} className="text-warning" aria-hidden="true" />
          </div>
          <h3 className="text-text-primary text-[14px] font-semibold mb-1">
            {this.props.name} couldn&apos;t render
          </h3>
          <p className="text-muted text-[12px] leading-relaxed mb-1">
            The rest of your workspace is safe — your tasks and drafts are intact.
          </p>
          {errorId && (
            <p className="text-muted text-[11px] font-mono mb-3">Error ID: {errorId}</p>
          )}
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-left text-[11px] font-mono text-error bg-error/10 border border-error/30 rounded p-2 mb-3 max-h-32 overflow-auto whitespace-pre-wrap break-words">
              {error.message}
              {error.stack ? `\n${error.stack.split('\n').slice(1, 4).join('\n')}` : ''}
            </pre>
          )}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.retry}
              className="btn-primary text-[12px]"
            >
              <RotateCcw size={13} aria-hidden="true" /> Retry {this.props.name}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary text-[12px]"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    )
  }
}

/** Clear local app state and force a clean re-login (used by global fallbacks). */
export function clearCacheAndRelogin() {
  try {
    // Drop only TaskFlowy keys — never blind-clear third-party storage.
    Object.keys(localStorage)
      .filter(k => k.startsWith('taskflowy'))
      .forEach(k => localStorage.removeItem(k))
    sessionStorage.clear()
  } catch { /* storage unavailable — proceed to reload anyway */ }
  window.location.href = '/sign-in?expired=1'
}

export function ClearCacheButton() {
  return (
    <button
      type="button"
      onClick={clearCacheAndRelogin}
      className="btn-secondary text-[12px]"
    >
      <Trash2 size={13} aria-hidden="true" /> Clear cache &amp; re-login
    </button>
  )
}
