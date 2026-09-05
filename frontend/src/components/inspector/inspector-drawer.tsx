'use client'

import { useState, useCallback } from 'react'
import { X, Trash2 } from 'lucide-react'
import { TimelineTask } from '@/lib/schema'
import { formatDateISO } from '@/lib/parser/date-grammar'
import { dateDiffDays } from '@/lib/schema'

interface InspectorDrawerProps {
  task: TimelineTask
  onClose: () => void
  onUpdate: (task: TimelineTask) => void
}

export function InspectorDrawer({ task, onClose, onUpdate }: InspectorDrawerProps) {
  const [name, setName] = useState(task.name)
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [start, setStart] = useState(task.start)
  const [end, setEnd] = useState(task.end)
  const [progress, setProgress] = useState(task.progress ?? 0)

  const handleApply = useCallback(() => {
    const s = new Date(start)
    const e = new Date(end)
    const duration = Math.max(1, dateDiffDays(s, e))
    onUpdate({
      ...task,
      name,
      assignee: assignee || null,
      start: formatDateISO(s),
      end: formatDateISO(e),
      durationDays: duration,
      progress,
    })
    onClose()
  }, [task, name, assignee, start, end, progress, onUpdate, onClose])

  return (
    <div className="w-[330px] bg-surface border-l border-border flex flex-col shrink-0 z-30 shadow-xl overflow-hidden">
      {/* Drawer header */}
      <div className="h-12 bg-surface/80 px-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-text-primary text-[14px] font-semibold truncate">Inspector: {task.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          {task.isCritical && (
            <span className="px-1.5 py-0.5 rounded bg-surface-hi text-critical text-[11px] font-semibold uppercase">Critical</span>
          )}
          {task.isMilestone && (
            <span className="px-1.5 py-0.5 rounded bg-surface-hi text-milestone text-[11px] font-semibold uppercase">Milestone</span>
          )}
          <button className="p-1 text-muted hover:text-text-primary rounded transition-colors" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Drawer body */}
      <div className="flex-1 p-3 flex flex-col gap-3.5 overflow-y-auto">
        {/* Task identifier */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="label">Task Identifier</label>
            <span className="w-full bg-surface-hi/20 rounded px-2.5 py-1.5 text-[13px] text-text-dim font-mono">{task.id}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Duration</label>
            <span className="w-full bg-surface-hi/20 rounded px-2.5 py-1.5 text-[13px] text-text-primary font-mono">{task.durationDays} days</span>
          </div>
        </div>

        {/* Task title */}
        <div className="flex flex-col gap-1">
          <label className="label">Task Name</label>
          <input
            className="w-full bg-surface-hi/20 rounded px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:ring-1 focus:ring-primary"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Assignee */}
        <div className="flex flex-col gap-1">
          <label className="label">Task Owner</label>
          <input
            className="w-full bg-surface-hi/20 rounded px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:ring-1 focus:ring-primary"
            type="text"
            placeholder="Assignee"
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="label">Start Date</label>
            <input
              className="bg-surface-hi/20 rounded px-2 py-1 text-[13px] font-mono text-text-primary outline-none focus:ring-1 focus:ring-primary"
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Finish Date</label>
            <input
              className="bg-surface-hi/20 rounded px-2 py-1 text-[13px] font-mono text-text-primary outline-none focus:ring-1 focus:ring-primary"
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Progress slider */}
        <div className="flex flex-col gap-2 bg-surface-hi/20 p-2.5 rounded">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted">Progress Completion</span>
            <span className="text-[12px] font-mono text-text-primary">{progress}%</span>
          </div>
          <input
            className="w-full h-1.5 accent-primary bg-surface-hi rounded cursor-pointer"
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={e => setProgress(+e.target.value)}
          />
        </div>

        {/* Dependencies summary */}
        {task.dependsOn && (
          <div className="flex flex-col gap-1.5">
            <span className="label">Predecessor</span>
            <div className="bg-surface-hi/20 rounded p-2 text-[12px]">
              <span className="text-muted">FS:</span>{' '}
              <span className="font-mono text-text-primary">{task.dependsOn}</span>
            </div>
          </div>
        )}
      </div>

      {/* Drawer footer actions */}
      <div className="border-t border-border p-3 flex items-center gap-2 shrink-0">
        <button className="flex-1 py-1.5 rounded bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold transition-colors" onClick={handleApply}>
          Apply Changes
        </button>
        <button className="p-1.5 rounded bg-surface-hi hover:bg-error/20 text-muted hover:text-error transition-colors" title="Delete Task">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}