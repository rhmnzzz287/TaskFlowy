'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { TimelineTask } from '@/lib/schema'
import { parseDate, formatDateISO } from '@/lib/parser/date-grammar'
import { parseDuration } from '@/lib/parser/duration-grammar'
import { dateDiffDays } from '@/lib/schema'
import { DurationInput } from '@/components/task-input/duration-input'

interface InspectorDrawerProps {
  task: TimelineTask
  onClose: () => void
  onUpdate: (task: TimelineTask) => void
  onDelete?: (taskId: string) => void
  /** When true, Save/Delete show spinner and block double-clicks. */
  busy?: boolean
}

export function InspectorDrawer({ task, onClose, onUpdate, onDelete, busy = false }: InspectorDrawerProps) {
  const [name, setName] = useState(task.name)
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [start, setStart] = useState(task.start)
  const [end, setEnd] = useState(task.end)
  const [progress, setProgress] = useState(task.progress ?? 0)
  const [duration, setDuration] = useState(`${task.durationDays} hari`)

  // Subtask Checklist State
  interface Subtask {
    id: string
    title: string
    completed: boolean
  }
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [syncProgress, setSyncProgress] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`taskflowy_subtasks_${task.id}`)
      if (saved) {
        setSubtasks(JSON.parse(saved))
      }
    } catch { /* ignore */ }
  }, [task.id])

  const saveSubtasks = (items: Subtask[]) => {
    setSubtasks(items)
    try {
      localStorage.setItem(`taskflowy_subtasks_${task.id}`, JSON.stringify(items))
    } catch { /* ignore */ }
    if (syncProgress && items.length > 0) {
      const done = items.filter(i => i.completed).length
      setProgress(Math.round((done / items.length) * 100))
    }
  }

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    const newItem: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    }
    const next = [...subtasks, newItem]
    saveSubtasks(next)
    setNewSubtaskTitle('')
  }

  const handleToggleSubtask = (id: string) => {
    const next = subtasks.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    )
    saveSubtasks(next)
  }

  const handleDeleteSubtask = (id: string) => {
    const next = subtasks.filter(item => item.id !== id)
    saveSubtasks(next)
  }

  // Dirty guard: closing with unsaved edits asks for confirmation instead
  // of silently discarding them (audit: dirty-form data loss). Also warns
  // on tab close/reload while edits are unsaved.
  const initialRef = useRef({ name: task.name, assignee: task.assignee ?? '', start: task.start, end: task.end, progress: task.progress ?? 0, duration: `${task.durationDays} hari` })
  const isDirty = name !== initialRef.current.name || assignee !== initialRef.current.assignee || start !== initialRef.current.start || end !== initialRef.current.end || progress !== initialRef.current.progress || duration !== initialRef.current.duration

  useEffect(() => {
    if (!isDirty) return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [isDirty])

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved task changes?')) return
    onClose()
  }, [isDirty, onClose])

  // Editing duration re-derives the end date (start + days - 1), mirroring the
  // deterministic auto-compute used in the row editor. Manual End edits stay
  // authoritative — handleApply recomputes durationDays from the date range.
  const handleDurationChange = useCallback((val: string) => {
    setDuration(val)
    const res = parseDuration(val)
    const s = parseDate(start, new Date().toISOString().slice(0, 10))
    if (res.ok && s.ok) {
      const e = new Date(s.value)
      e.setDate(e.getDate() + Math.max(0, res.days - 1))
      setEnd(formatDateISO(e))
    }
  }, [start])

  const handleApply = useCallback(() => {
    const s = new Date(start)
    const e = new Date(end)
    const durRes = parseDuration(duration)
    // Preserve 0-day milestones: end==start alone cannot distinguish them
    // from a genuine 1-day task, so trust the explicit duration input.
    const durationDays = durRes.ok && durRes.days === 0
      ? 0
      : Math.max(1, dateDiffDays(s, e))
    onUpdate({
      ...task,
      name,
      assignee: assignee || null,
      start: formatDateISO(s),
      end: formatDateISO(e),
      durationDays,
      progress,
    })
    onClose()
  }, [task, name, assignee, start, end, duration, progress, onUpdate, onClose])

  return (
    <div className="w-[330px] bg-surface border-l border-border flex flex-col shrink-0 z-30 shadow-xl overflow-hidden no-print">
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
          <button className="p-1 text-muted hover:text-text-primary rounded transition-colors" onClick={handleClose} aria-label="Close inspector">
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
            <DurationInput
              error={!parseDuration(duration).ok}
              value={duration}
              onChange={handleDurationChange}
              className="bg-surface-hi/20 rounded px-2.5 py-1.5 text-[13px] font-mono"
            />
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

        {/* Subtasks / Checklist */}
        <div className="flex flex-col gap-2 bg-surface-hi/20 p-2.5 rounded">
          <div className="flex items-center justify-between">
            <span className="label">Subtasks & Checklist</span>
            {subtasks.length > 0 && (
              <span className="text-[11px] font-mono text-muted">
                {subtasks.filter(i => i.completed).length}/{subtasks.length} done
              </span>
            )}
          </div>

          {/* Checklist items */}
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {subtasks.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-xs py-0.5 group">
                <label className="flex items-center gap-2 min-w-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleSubtask(item.id)}
                    className="w-3.5 h-3.5 accent-primary rounded cursor-pointer shrink-0"
                  />
                  <span className={`truncate ${item.completed ? 'line-through text-muted' : 'text-text-primary'}`}>
                    {item.title}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(item.id)}
                  className="text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Remove subtask"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new subtask input */}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              placeholder="Add subtask..."
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              className="flex-1 bg-surface-hi/40 rounded px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim()}
              className="px-2 py-1 rounded bg-primary text-white text-xs font-medium disabled:opacity-40 hover:bg-primary-hover transition-colors"
            >
              Add
            </button>
          </form>

          {/* Auto-sync progress toggle */}
          {subtasks.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                checked={syncProgress}
                onChange={e => {
                  setSyncProgress(e.target.checked)
                  if (e.target.checked && subtasks.length > 0) {
                    const done = subtasks.filter(i => i.completed).length
                    setProgress(Math.round((done / subtasks.length) * 100))
                  }
                }}
                className="w-3 h-3 accent-primary rounded cursor-pointer"
              />
              <span>Auto-sync progress from subtasks</span>
            </label>
          )}
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
        <button
          className="flex-1 py-1.5 rounded bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          onClick={handleApply}
          disabled={busy}
        >
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          Save Task Details
        </button>
        <button
          className="p-1.5 rounded bg-surface-hi hover:bg-error/20 text-muted hover:text-error transition-colors disabled:opacity-60"
          title="Delete Task"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Delete task "${task.name}"? This can be undone from the toast.`)) return
            onDelete?.(task.id); onClose()
          }}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}