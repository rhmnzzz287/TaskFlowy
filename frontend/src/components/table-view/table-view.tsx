'use client'

import { useState, useMemo } from 'react'
import type { TimelineTask } from '@/lib/schema'
import { formatDateDisplay, deadlineBadge } from '@/lib/parser/date-grammar'
import { taskStatus } from '@/lib/task-status'
import { Diamond, Flame, ArrowUpDown } from 'lucide-react'

interface TableViewProps {
  tasks: TimelineTask[]
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

type SortKey = 'name' | 'assignee' | 'start' | 'end' | 'durationDays' | 'status'
type SortDir = 'asc' | 'desc'

export function TableView({ tasks, onSelectTask, selectedTaskId }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('start')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...tasks]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'status') {
        cmp = taskStatus(a).rank - taskStatus(b).rank
      } else {
        const va = a[sortKey] ?? ''
        const vb = b[sortKey] ?? ''
        cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : Number(va) - Number(vb)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [tasks, sortKey, sortDir])

  const statusBadge = (t: TimelineTask) => taskStatus(t)

  const ariaSortFor = (k: SortKey): 'none' | 'ascending' | 'descending' => {
    if (sortKey !== k) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => {
    const isActive = sortKey === k
    const stateText = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'not sorted'
    return (
      <button
        className="w-full flex items-center justify-center gap-1 hover:text-text-primary transition-colors text-inherit focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
        onClick={() => toggleSort(k)}
        aria-label={`Sort by ${typeof children === 'string' ? children : k}, currently ${stateText}`}>
        {children}
        <ArrowUpDown size={10} className={`${isActive ? 'text-primary' : 'opacity-30'}`} aria-hidden="true" />
      </button>
    )
  }

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const t = sorted[index]
      if (t) onSelectTask?.(t.id)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? index + 1 : index - 1
      const target = sorted[next]
      if (!target) return
      onSelectTask?.(target.id)
      document.querySelector<HTMLElement>(`[data-task-id="${target.id}"]`)?.focus()
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-[13px]">
        No tasks yet. Generate a timeline first.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" role="grid" aria-label="Task table" aria-rowcount={sorted.length + 1} aria-colcount={7}>
      {/* Header */}
      <div role="row" className="h-10 bg-surface/80 flex items-center px-3 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border shrink-0 sticky top-0 z-10">
        <div role="columnheader" className="w-8 text-center shrink-0">#</div>
        <div role="columnheader" aria-sort={ariaSortFor('name')} className="flex-1 min-w-0 px-1 text-center"><SortHeader k="name">Task</SortHeader></div>
        <div role="columnheader" aria-sort={ariaSortFor('assignee')} className="w-20 text-center shrink-0"><SortHeader k="assignee">Lead</SortHeader></div>
        <div role="columnheader" aria-sort={ariaSortFor('start')} className="w-24 text-center shrink-0"><SortHeader k="start">Start</SortHeader></div>
        <div role="columnheader" aria-sort={ariaSortFor('end')} className="w-24 text-center shrink-0"><SortHeader k="end">End</SortHeader></div>
        <div role="columnheader" aria-sort={ariaSortFor('durationDays')} className="w-16 text-center shrink-0"><SortHeader k="durationDays">Days</SortHeader></div>
        <div role="columnheader" aria-sort={ariaSortFor('status')} className="w-20 text-center shrink-0"><SortHeader k="status">Status</SortHeader></div>
      </div>

      {/* Rows */}
      <div role="rowgroup" className="flex-1 overflow-y-auto divide-y divide-border/30">
        {sorted.map((t, i) => {
          const badge = statusBadge(t)
          const badgeDeadline = deadlineBadge(t.end)
          return (
            <div
              key={t.id}
              role="row"
              aria-selected={selectedTaskId === t.id}
              aria-rowindex={i + 2}
              data-task-id={t.id}
              className={`h-11 flex items-center px-3 transition-colors cursor-pointer text-[13px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
                ${selectedTaskId === t.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent hover:bg-surface-hi/30'}`}
              onClick={() => onSelectTask?.(t.id)}
              onKeyDown={e => handleRowKeyDown(e, i)}
              tabIndex={0}
              aria-label={`${t.name}, ${formatDateDisplay(t.start)} to ${formatDateDisplay(t.end)}, ${badge.label}`}>
              <div role="gridcell" className="w-8 text-center shrink-0 text-muted font-mono text-[12px]">{i + 1}</div>
              <div role="gridcell" className="flex-1 min-w-0 px-1 flex items-center justify-center gap-1.5 text-center">
                {t.isMilestone && <Diamond size={12} className="shrink-0 text-milestone" aria-hidden="true" />}
                {t.isCritical && !t.isMilestone && <Flame size={12} className="shrink-0 text-critical" aria-hidden="true" />}
                <span className="truncate text-text-primary">{t.name}</span>
              </div>
              <div role="gridcell" className="w-20 text-center shrink-0 text-text-dim font-mono text-[12px] truncate px-1">
                {t.assignee || '-'}
              </div>
              <div role="gridcell" className="w-24 text-center shrink-0 font-mono text-[12px] text-text-dim">{formatDateDisplay(t.start)}</div>
              <div role="gridcell" className="w-24 text-center shrink-0 font-mono text-[12px] flex items-center justify-center">
                <span className="text-text-dim">{formatDateDisplay(t.end)}</span>
                {badgeDeadline && (
                  <span className={`ml-1 px-1 rounded text-[9px] font-semibold ${badgeDeadline.cls}`}>{badgeDeadline.label}</span>
                )}
              </div>
              <div role="gridcell" className="w-16 text-center shrink-0">
                <span className={`font-mono text-[12px] ${t.isMilestone ? 'text-milestone' : 'text-text-dim'}`}>
                  {t.isMilestone ? '◆' : `${t.durationDays}d`}
                </span>
              </div>
              <div role="gridcell" className="w-20 flex justify-center shrink-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="h-9 bg-surface/30 border-t border-border px-3 flex items-center justify-between shrink-0 text-[11px] text-muted">
        <span>{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
        <span className="font-mono">
          {tasks.reduce((s, t) => s + (t.isMilestone ? 0 : t.durationDays), 0)} days ·{' '}
          {tasks.filter(t => (t.progress ?? 0) >= 100).length} done
        </span>
      </div>
    </div>
  )
}