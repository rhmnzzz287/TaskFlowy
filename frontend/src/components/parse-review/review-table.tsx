'use client'

import { useState, useMemo, useCallback } from 'react'
import { Diamond, Flame, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { TimelineTask } from '@/lib/schema'
import { taskStatus } from '@/lib/task-status'

interface ReviewTableProps {
  tasks: TimelineTask[]
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

type SortKey = 'name' | 'assignee' | 'durationDays' | 'status'
type SortDir = 'asc' | 'desc'

/** Compact "Sep 10 → Sep 13" range. Falls back to raw ISO on invalid dates. */
function formatShort(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10) || '-'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dateRangeLine(t: TimelineTask): string {
  if (t.isMilestone) return `${formatShort(t.start)} · Milestone`
  return `${formatShort(t.start)} → ${formatShort(t.end)}`
}

function fullDescribe(t: TimelineTask): string {
  const st = taskStatus(t)
  const bits = [
    t.name,
    dateRangeLine(t),
    t.isMilestone ? 'milestone' : `${t.durationDays} days`,
    t.assignee ? `owner ${t.assignee}` : 'unassigned',
    `status ${st.label}`,
    `progress ${t.progress ?? 0}%`,
  ]
  return bits.join(', ')
}

export function ReviewTable({ tasks, onSelectTask, selectedTaskId }: ReviewTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }, [sortKey])

  const sortedTasks = useMemo(() => {
    if (!sortKey) return tasks
    const arr = [...tasks]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'status') {
        cmp = taskStatus(a).rank - taskStatus(b).rank
      } else if (sortKey === 'durationDays') {
        cmp = (a.durationDays ?? 0) - (b.durationDays ?? 0)
      } else {
        const va = (a[sortKey] ?? '').trim()
        const vb = (b[sortKey] ?? '').trim()
        cmp = va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: true })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [tasks, sortKey, sortDir])

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const t = sortedTasks[index]
      if (t) onSelectTask?.(t.id)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? index + 1 : index - 1
      const target = sortedTasks[next]
      if (!target) return
      onSelectTask?.(target.id)
      // Move DOM focus so keyboard users can keep stepping through rows.
      const el = document.querySelector<HTMLElement>(`[data-task-id="${target.id}"]`)
      el?.focus()
    }
  }, [sortedTasks, onSelectTask])

  if (tasks.length === 0) return null

  const ariaSortFor = (k: SortKey): 'none' | 'ascending' | 'descending' => {
    if (sortKey !== k) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => {
    const isActive = sortKey === k
    const stateText = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'not sorted'
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        aria-label={`Sort by ${label}, currently ${stateText}`}
        className={`w-full flex items-center justify-center gap-1 transition-colors hover:text-text-primary uppercase tracking-wider text-[11px] font-medium cursor-pointer select-none group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded ${
          isActive ? 'text-primary font-semibold' : 'text-muted'
        }`}
        title={`Sort by ${label} (${isActive ? (sortDir === 'asc' ? 'Ascending' : 'Descending') : 'Klik untuk urutkan'})`}
      >
        <span>{label}</span>
        {isActive ? (
          sortDir === 'asc' ? (
            <ArrowUp size={10} className="shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <ArrowDown size={10} className="shrink-0 text-primary" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={10} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full" role="grid" aria-label="Parsed tasks review" aria-rowcount={sortedTasks.length + 1} aria-colcount={5}>
      {/* Header */}
      <div role="row" className="h-9 bg-surface/50 flex items-center px-2 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border">
        <div role="columnheader" className="w-6 text-center shrink-0">#</div>
        <div role="columnheader" aria-sort={ariaSortFor('name')} className="flex-1 min-w-0 px-1 text-center">
          <SortHeader k="name" label="Task" />
        </div>
        <div role="columnheader" aria-sort={ariaSortFor('assignee')} className="w-14 text-center shrink-0">
          <SortHeader k="assignee" label="Lead" />
        </div>
        <div role="columnheader" aria-sort={ariaSortFor('durationDays')} className="w-12 text-center shrink-0">
          <SortHeader k="durationDays" label="Days" />
        </div>
        <div role="columnheader" aria-sort={ariaSortFor('status')} className="w-16 text-center shrink-0">
          <SortHeader k="status" label="Status" />
        </div>
      </div>

      {/* Rows */}
      <div role="rowgroup" className="flex-1 overflow-y-auto divide-y divide-border/50">
        {sortedTasks.map((t, i) => {
          const st = taskStatus(t)
          const isSel = selectedTaskId === t.id
          const statusColors: Record<string, string> = {
            'completed': 'text-completed',
            'critical': 'text-critical',
            'milestone': 'text-milestone',
            'in-progress': 'text-secondary',
            'planned': 'text-text-dim',
          }

          return (
            <div
              key={t.id}
              role="row"
              aria-selected={isSel}
              aria-rowindex={i + 2}
              data-task-id={t.id}
              title={`${t.name} · ${dateRangeLine(t)} · ${t.durationDays}d · ${t.assignee || 'Unassigned'} · ${st.label} · ${t.progress ?? 0}%`}
              className={`min-h-[52px] py-1 flex items-center px-2 transition-colors cursor-pointer border-l-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                isSel
                  ? 'bg-primary/10 border-l-primary'
                  : 'border-l-transparent hover:bg-surface-hi/30'
              }`}
              onClick={() => onSelectTask?.(t.id)}
              onKeyDown={e => handleRowKeyDown(e, i)}
              tabIndex={0}
              aria-label={fullDescribe(t)}
            >
              {/* # */}
              <div role="gridcell" className="w-6 text-center shrink-0 self-start pt-2">
                <span className={`font-mono text-[12px] ${isSel ? 'text-primary font-bold' : 'text-muted'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              {/* Name + date range */}
              <div role="gridcell" className="flex-1 min-w-0 px-1 flex flex-col items-center justify-center gap-0.5 text-center">
                <span className="w-full flex items-center justify-center gap-1 min-w-0">
                  {t.isMilestone ? (
                    <Diamond size={12} className="shrink-0 text-milestone" aria-hidden="true" />
                  ) : t.isCritical ? (
                    <Flame size={12} className="shrink-0 text-critical" aria-hidden="true" />
                  ) : null}
                  <span className={`text-[13px] truncate min-w-0 ${isSel ? 'text-primary font-semibold' : 'text-text-primary'}`}>
                    {t.name}
                  </span>
                </span>
                <span className={`font-mono text-[11px] whitespace-nowrap truncate max-w-full ${
                  t.isMilestone ? 'text-milestone font-semibold' : 'text-muted'
                }`}>
                  {dateRangeLine(t)}
                </span>
              </div>
              {/* Lead */}
              <div role="gridcell" className="w-14 flex justify-center shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-surface-hi text-text-dim text-[11px] font-mono truncate max-w-[50px]">
                  {t.assignee ? t.assignee.slice(0, 4) : '-'}
                </span>
              </div>
              {/* Days */}
              <div role="gridcell" className="w-12 text-center shrink-0">
                <span className={`font-mono text-[12px] ${statusColors[st.status] || 'text-text-dim'}`}>
                  {t.isMilestone ? '◆' : `${t.durationDays}d`}
                </span>
              </div>
              {/* Status */}
              <div role="gridcell" className="w-16 flex justify-center shrink-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${st.cls}`}>
                  {st.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick add footer */}
      <div className="h-9 bg-surface/30 border-t border-border px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted text-[11px]" aria-live="polite">{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
          {sortKey && (
            <button
              type="button"
              onClick={() => setSortKey(null)}
              className="text-[10px] text-primary hover:underline transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
              title="Reset urutan ke awal"
            >
              Reset sort
            </button>
          )}
        </div>
        <span className="text-muted text-[11px] font-mono">
          {tasks.reduce((s, t) => s + (t.isMilestone ? 0 : t.durationDays), 0)} days
        </span>
      </div>
    </div>
  )
}
