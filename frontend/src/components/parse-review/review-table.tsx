'use client'

import { CheckCircle2, AlertCircle, Diamond, Flame } from 'lucide-react'
import { TimelineTask } from '@/lib/schema'

interface ReviewTableProps {
  tasks: TimelineTask[]
  warnings: string[]
  compact?: boolean
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

export function ReviewTable({ tasks, warnings, compact, onSelectTask, selectedTaskId }: ReviewTableProps) {
  if (tasks.length === 0) return null

  return (
    <div className="flex flex-col h-full">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-warning/10 border-b border-warning/30 px-3 py-2">
          {warnings.map((w, i) => (
            <p key={i} className="text-warning text-[12px]">{w}</p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="h-9 bg-surface/50 flex items-center px-2 text-muted text-[11px] font-medium uppercase tracking-wider border-b border-border">
        <div className="w-6 text-center shrink-0">#</div>
        <div className="flex-1 min-w-0 px-1">Task</div>
        <div className="w-14 text-center shrink-0">Lead</div>
        <div className="w-12 text-center shrink-0">Days</div>
        <div className="w-16 text-center shrink-0">Status</div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {tasks.map((t, i) => {
          const status = (t.progress ?? 0) >= 100 ? 'completed'
            : t.isMilestone ? 'milestone'
            : t.isCritical ? 'critical'
            : 'in-progress'
          const statusColors: Record<string, string> = {
            'completed': 'text-completed',
            'critical': 'text-critical',
            'milestone': 'text-milestone',
            'in-progress': 'text-secondary',
          }

          return (
            <div
              key={t.id}
              className={`h-10 flex items-center px-2 transition-colors cursor-pointer border-l-2 ${
                selectedTaskId === t.id
                  ? 'bg-primary/10 border-l-primary'
                  : 'border-l-transparent hover:bg-surface-hi/30'
              }`}
              onClick={() => onSelectTask?.(t.id)}
            >
              {/* # */}
              <div className="w-6 text-center shrink-0">
                <span className={`font-mono text-[12px] ${selectedTaskId === t.id ? 'text-primary font-bold' : 'text-muted'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0 px-1 flex items-center gap-1">
                {t.isMilestone ? (
                  <Diamond size={12} className="shrink-0 text-milestone" />
                ) : t.isCritical ? (
                  <Flame size={12} className="shrink-0 text-critical" />
                ) : null}
                <span className={`text-[13px] truncate ${selectedTaskId === t.id ? 'text-primary font-semibold' : 'text-text-primary'}`}>
                  {t.name}
                </span>
              </div>
              {/* Lead */}
              <div className="w-14 flex justify-center shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-surface-hi text-text-dim text-[11px] font-mono truncate max-w-[50px]">
                  {t.assignee ? t.assignee.slice(0, 4) : '—'}
                </span>
              </div>
              {/* Days */}
              <div className="w-12 text-center shrink-0">
                <span className={`font-mono text-[12px] ${statusColors[status] || 'text-text-dim'}`}>
                  {t.isMilestone ? '◆' : `${t.durationDays}d`}
                </span>
              </div>
              {/* Status */}
              <div className="w-16 flex justify-center shrink-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${statusColors[status]} bg-surface-hi/50`}>
                  {t.isMilestone ? 'Milestone'
                    : t.isCritical ? 'Critical'
                    : (t.progress ?? 0) >= 100 ? 'Done'
                    : (t.progress ?? 0) > 0 ? `${t.progress}%`
                    : status}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick add footer */}
      <div className="h-9 bg-surface/30 border-t border-border px-3 flex items-center justify-between">
        <span className="text-muted text-[11px]">{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
        <span className="text-muted text-[11px] font-mono">
          {tasks.reduce((s, t) => s + (t.isMilestone ? 0 : t.durationDays), 0)} days
        </span>
      </div>
    </div>
  )
}