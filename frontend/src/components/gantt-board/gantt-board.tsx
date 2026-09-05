'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { TimelineTask } from '@/lib/schema'
import { toGanttTasks, initGantt } from './gantt-adapter'
import { formatDateISO } from '@/lib/parser/date-grammar'
import { dateDiffDays } from '@/lib/schema'

interface GanttBoardProps {
  tasks: TimelineTask[]
  selectedAssignees: string[]
  onTasksChange: (tasks: TimelineTask[]) => void
  onSelectTask?: (taskId: string) => void
}

export function GanttBoard({ tasks, selectedAssignees, onTasksChange, onSelectTask }: GanttBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const lastRenderRef = useRef<string>('')

  const handleDateChange = useCallback(
    (id: string, newStart: Date, newEnd: Date) => {
      const updated = tasks.map(t => {
        if (t.id !== id) return t
        const start = formatDateISO(newStart)
        const end = formatDateISO(newEnd)
        const durationDays = Math.max(1, dateDiffDays(newStart, newEnd))
        return { ...t, start, end, durationDays }
      })
      onTasksChange(updated)
    },
    [tasks, onTasksChange],
  )

  const handleClick = useCallback(
    (taskId: string) => {
      onSelectTask?.(taskId)
    },
    [onSelectTask],
  )

  // Re-init Gantt when tasks or filter change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ganttTasks = toGanttTasks(tasks, selectedAssignees)
    const renderKey = JSON.stringify(ganttTasks.map(t => [t.id, t.start, t.end]))

    if (renderKey === lastRenderRef.current) {
      setLoading(false)
      return
    }
    lastRenderRef.current = renderKey

    if (ganttTasks.length === 0) {
      el.innerHTML =
        '<div class="flex items-center justify-center h-40 text-muted text-[13px]">No tasks. Add rows and generate to build your timeline.</div>'
      setLoading(false)
      return
    }

    el.innerHTML = ''
    setLoading(true)

    let cancelled = false
    initGantt({
      element: el,
      tasks: ganttTasks,
      onDateChange: handleDateChange,
      onClick: handleClick,
    }).then(
      _gantt => {
        if (!cancelled) {
          setLoading(false)
          applyDarkTheme()
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [tasks, selectedAssignees, handleDateChange, handleClick])

  return (
    <div className="flex-1 bg-surface-dim rounded-none border-none overflow-hidden flex flex-col min-h-0">
      <div
        ref={containerRef}
        className="gantt-wrapper flex-1 overflow-auto relative"
        style={{ minHeight: '280px' }}
      />
    </div>
  )
}

function applyDarkTheme() {
  if (document.getElementById('gantt-dark-theme')) return
  const style = document.createElement('style')
  style.id = 'gantt-dark-theme'
  style.textContent = `
    .gantt {
      --font-family: 'Inter', sans-serif;
      --bar-color: #0D9488;
      --bar-progress-color: #14B8A6;
      --bar-stroke: #0D9488;
      --today-color: #4F46E5;
      border: none !important;
    }
    .gantt .grid-background { fill: #0F172A !important; }
    .gantt .grid-header { fill: #1E293B !important; stroke: #334155 !important; }
    .gantt .grid-row { fill: #0F172A !important; }
    .gantt .grid-row:nth-child(even) { fill: #131B2E !important; }
    .gantt .row-line { stroke: #334155 !important; }
    .gantt .tick { stroke: #334155 !important; }
    .gantt .today-highlight { fill: #4F46E5 !important; opacity: 0.12 !important; }
    .gantt .bar-label, .gantt .bar-label.big { fill: #DAE2FD !important; font-size: 11px !important; font-weight: 500; }
    .gantt .lower-text, .gantt .upper-text { fill: #64748B !important; font-size: 10px !important; font-weight: 600; letter-spacing: 0.05em; }
    .gantt .bar-wrapper .bar { fill: #0D9488 !important; stroke: #14B8A6 !important; }
    .gantt .bar-wrapper .bar-progress { fill: #14B8A6 !important; }
    .gantt .bar-wrapper.active .bar { fill: #4F46E5 !important; stroke: #6366F1 !important; }
    .gantt .bar-wrapper.active .bar-progress { fill: #6366F1 !important; }
    .gantt .handle { fill: #fff !important; opacity: 0.6; }
  `
  document.head.appendChild(style)
}