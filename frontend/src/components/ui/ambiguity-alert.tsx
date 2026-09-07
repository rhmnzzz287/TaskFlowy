'use client'

import { useState, useMemo, useEffect } from 'react'
import { AlertTriangle, X, ChevronDown, ChevronRight, ArrowRight, AlertCircle, Info, Link2 } from 'lucide-react'
import type { TimelineTask, ParseRowState } from '@/lib/schema'

interface AmbiguityAlertProps {
  warnings: string[]
  tasks?: TimelineTask[]
  inputRows?: ParseRowState[]
  onSelectTask?: (taskId: string) => void
}

type WarningKind = 'missing' | 'ambiguous' | 'invalid' | 'dependency'

interface ClassifiedWarning {
  raw: string
  kind: WarningKind
  taskId: string | null
  taskName: string | null
  rowIndex: number | null
}

const KIND_META: Record<WarningKind, { label: string; cls: string; Icon: typeof Info }> = {
  missing: { label: 'Missing info', cls: 'text-warning bg-warning/10', Icon: Info },
  ambiguous: { label: 'Ambiguous date', cls: 'text-secondary bg-secondary/10', Icon: AlertCircle },
  invalid: { label: 'Invalid value', cls: 'text-error bg-error/10', Icon: AlertCircle },
  dependency: { label: 'Dependency', cls: 'text-milestone bg-milestone/10', Icon: Link2 },
}

function classifyKind(msg: string): WarningKind {
  if (/depend|predecessor|cycle|loop|\bFS\b|\bSS\b|\bFF\b|\bSF\b/i.test(msg)) return 'dependency'
  if (/required|kosong|missing|no start|empty|without|not found|unknown task/i.test(msg)) return 'missing'
  if (/ambigu|may be|reference date|disagree|interpreted as|assumed/i.test(msg)) return 'ambiguous'
  return 'invalid'
}

/** "Row 3: ..." → 2 (0-based). Null when the warning isn't row-scoped. */
function rowIndexOf(msg: string): number | null {
  const m = /^\s*Row\s+(\d+)\s*:/i.exec(msg)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n >= 1 ? n - 1 : null
}

/** Resolve task ids embedded in cycle messages to human names. */
function humanizeIds(msg: string, tasks: TimelineTask[]): string {
  if (!/task-/i.test(msg)) return msg
  const byId = new Map(tasks.map(t => [t.id, t.name]))
  return msg.replace(/task-[A-Za-z0-9_-]+/g, id => byId.get(id) ?? id)
}

export function AmbiguityAlert({ warnings, tasks = [], inputRows = [], onSelectTask }: AmbiguityAlertProps) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // A new parse result re-opens the banner — warnings must survive partial
  // parses instead of staying dismissed from an earlier run.
  const sig = warnings.join('\n')
  useEffect(() => { setDismissed(false) }, [sig])

  const items: ClassifiedWarning[] = useMemo(() => {
    const byName = new Map(tasks.map(t => [t.name.trim().toLowerCase(), t]))
    return warnings.map(raw => {
      const kind = classifyKind(raw)
      const rowIndex = rowIndexOf(raw)
      let taskId: string | null = null
      let taskName: string | null = null
      if (rowIndex !== null && inputRows[rowIndex]) {
        const rowName = inputRows[rowIndex].name.trim().toLowerCase()
        const hit = rowName ? byName.get(rowName) : undefined
        if (hit) { taskId = hit.id; taskName = hit.name }
        else if (inputRows[rowIndex].name.trim()) taskName = inputRows[rowIndex].name.trim()
      }
      // Dependency cycles name ids, not rows — try to surface at least one
      // involved task for navigation.
      if (!taskId && kind === 'dependency' && tasks.length > 0) {
        const hit = tasks.find(t => raw.includes(t.id))
        if (hit) { taskId = hit.id; taskName = hit.name }
      }
      return { raw: humanizeIds(raw, tasks), kind, taskId, taskName, rowIndex }
    })
  }, [warnings, tasks, inputRows])

  if (dismissed || items.length === 0) return null

  const showList = expanded || items.length <= 2

  const handleReview = (item: ClassifiedWarning) => {
    if (!item.taskId || !onSelectTask) return
    onSelectTask(item.taskId)
    // Bring the review-table row into view and move focus to it so keyboard
    // users land on the exact task the warning refers to.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-task-id="${item.taskId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      el?.focus({ preventScroll: true })
    })
  }

  const first = items[0]

  return (
    <div role="alert" aria-live="polite" className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <AlertTriangle size={15} className="text-warning shrink-0" aria-hidden="true" />
          <p className="text-[13px] text-text-primary truncate">
            <span className="font-semibold text-warning">{items.length} Warning{items.length > 1 ? 's' : ''}:</span>{' '}
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${KIND_META[first.kind].cls}`}>
              {KIND_META[first.kind].label}
            </span>{' '}
            <span className="ml-1">{first.raw}</span>
          </p>
          {first.taskId && onSelectTask && (
            <button
              type="button"
              onClick={() => handleReview(first)}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning/15 text-warning text-[11px] font-semibold hover:bg-warning/25 transition-colors focus-visible:ring-2 focus-visible:ring-warning focus-visible:outline-none"
              title={first.taskName ? `Select task "${first.taskName}"` : 'Review task'}
            >
              Review task <ArrowRight size={11} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {items.length > 2 && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              className="p-1 text-muted hover:text-text-primary rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title={expanded ? 'Collapse warnings' : `Show all ${items.length} warnings`}
            >
              {expanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            </button>
          )}
          <button
            type="button"
            className="p-1 text-muted hover:text-text-primary rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss warnings"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showList && items.length > 1 && (
        <ul className="flex flex-col gap-1 pl-7">
          {items.slice(1, expanded ? undefined : 2).map((item, idx) => {
            const meta = KIND_META[item.kind]
            const Icon = meta.Icon
            return (
              <li key={idx} className="flex items-center gap-2 min-w-0 text-[12px]">
                <Icon size={12} className="shrink-0 text-muted" aria-hidden="true" />
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${meta.cls}`}>
                  {meta.label}
                </span>
                <span className="text-text-primary truncate flex-1" title={item.raw}>{item.raw}</span>
                {item.taskId && onSelectTask && (
                  <button
                    type="button"
                    onClick={() => handleReview(item)}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning/15 text-warning text-[11px] font-semibold hover:bg-warning/25 transition-colors focus-visible:ring-2 focus-visible:ring-warning focus-visible:outline-none"
                    title={item.taskName ? `Select task "${item.taskName}"` : 'Review task'}
                  >
                    Review task <ArrowRight size={11} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
          {!expanded && items.length > 3 && (
            <li>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-[11px] text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
              >
                Show {items.length - 3} more…
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
