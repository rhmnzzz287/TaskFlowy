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

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button className="w-full flex items-center justify-center gap-1 hover:text-text-primary transition-colors text-inherit"
      onClick={() => toggleSort(k)}>
      {children}
      <ArrowUpDown size={10} className={`${sortKey === k ? 'text-primary' : 'opacity-30'}`} />
    </button>
  )

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-[13px]">
        No tasks yet. Generate a timeline first.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="h-10 bg-surface/80 flex items-center px-3 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border shrink-0 sticky top-0 z-10">
        <div className="w-8 text-center shrink-0">#</div>
        <div className="flex-1 min-w-0 px-1 text-center"><SortHeader k="name">Task</SortHeader></div>
        <div className="w-20 text-center shrink-0"><SortHeader k="assignee">Lead</SortHeader></div>
        <div className="w-24 text-center shrink-0"><SortHeader k="start">Start</SortHeader></div>
        <div className="w-24 text-center shrink-0"><SortHeader k="end">End</SortHeader></div>
        <div className="w-16 text-center shrink-0"><SortHeader k="durationDays">Days</SortHeader></div>
        <div className="w-20 text-center shrink-0"><SortHeader k="status">Status</SortHeader></div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {sorted.map((t, i) => {
          const badge = statusBadge(t)
          const badgeDeadline = deadlineBadge(t.end)
          return (
            <div
              key={t.id}
              className={`h-11 flex items-center px-3 transition-colors cursor-pointer text-[13px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
                ${selectedTaskId === t.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent hover:bg-surface-hi/30'}`}
              onClick={() => onSelectTask?.(t.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTask?.(t.id) } }}
              tabIndex={0}
              role="button"
              aria-label={`Select task ${t.name}`}
            >
              <div className="w-8 text-center shrink-0 text-muted font-mono text-[12px]">{i + 1}</div>
              <div className="flex-1 min-w-0 px-1 flex items-center justify-center gap-1.5 text-center">
                {t.isMilestone && <Diamond size={12} className="shrink-0 text-milestone" />}
                {t.isCritical && !t.isMilestone && <Flame size={12} className="shrink-0 text-critical" />}
                <span className="truncate text-text-primary">{t.name}</span>
              </div>
              <div className="w-20 text-center shrink-0 text-text-dim font-mono text-[12px] truncate px-1">
                {t.assignee || '-'}
              </div>
              <div className="w-24 text-center shrink-0 font-mono text-[12px] text-text-dim">{formatDateDisplay(t.start)}</div>
              <div className="w-24 text-center shrink-0 font-mono text-[12px] flex items-center justify-center">
                <span className="text-text-dim">{formatDateDisplay(t.end)}</span>
                {badgeDeadline && (
                  <span className={`ml-1 px-1 rounded text-[9px] font-semibold ${badgeDeadline.cls}`}>{badgeDeadline.label}</span>
                )}
              </div>
              <div className="w-16 text-center shrink-0">
                <span className={`font-mono text-[12px] ${t.isMilestone ? 'text-milestone' : 'text-text-dim'}`}>
                  {t.isMilestone ? '◆' : `${t.durationDays}d`}
                </span>
              </div>
              <div className="w-20 flex justify-center shrink-0">
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