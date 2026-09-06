'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { TimelineTask } from '@/lib/schema'
import { toGanttTasks, initGantt } from './gantt-adapter'
import { formatDateISO } from '@/lib/parser/date-grammar'
import { dateDiffDays } from '@/lib/schema'

export interface GanttBoardHandle {
  scrollLeft: (px: number) => void
  scrollToToday: () => void
  getContainer: () => HTMLElement | null
}

interface GanttBoardProps {
  tasks: TimelineTask[]
  selectedAssignees: string[]
  onTasksChange: (tasks: TimelineTask[]) => void
  onSelectTask?: (taskId: string) => void
  viewMode?: 'Day' | 'Week' | 'Month'
  showCritical?: boolean
  zoom?: number  // 1-5, mapped to CSS scale
}

export const GanttBoard = forwardRef<GanttBoardHandle, GanttBoardProps>(
  function GanttBoard({ tasks, selectedAssignees, onTasksChange, onSelectTask, viewMode = 'Week', showCritical = true, zoom = 3 }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
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

  // Expose scroll controls via ref
  useImperativeHandle(ref, () => ({
    scrollLeft: (px: number) => {
      if (scrollRef.current) scrollRef.current.scrollLeft += px
    },
    scrollToToday: () => {
      const el = scrollRef.current
      if (!el) return
      // Find today-highlight rect inside the gantt SVG
      const today = el.querySelector('.today-highlight') as SVGRectElement
      if (today) {
        const x = today.getBBox().x
        el.scrollLeft = Math.max(0, x - el.clientWidth / 3)
      }
    },
    getContainer: () => scrollRef.current,
  }))

  // Re-init Gantt when tasks, filter, viewMode, or showCritical change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ganttTasks = toGanttTasks(tasks, selectedAssignees)
    const renderKey = JSON.stringify([ganttTasks.map(t => [t.id, t.start, t.end]), viewMode, showCritical])

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
      viewMode,
    }).then(
      () => {
        if (!cancelled) {
          setLoading(false)
          applyDarkTheme(showCritical)
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [tasks, selectedAssignees, handleDateChange, handleClick, viewMode, showCritical])

  // Zoom via CSS transform
  const zoomScale = 0.6 + (zoom - 1) * 0.2 // 1→0.6, 3→1.0, 5→1.4

  return (
    <div className="flex-1 bg-surface-dim rounded-none border-none overflow-hidden flex flex-col min-h-0">
      <div
        ref={scrollRef}
        className="gantt-wrapper flex-1 overflow-auto relative"
        style={{ minHeight: '280px' }}
      >
        <div ref={containerRef} style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }} />
      </div>
    </div>
  )
})

function applyDarkTheme(showCritical: boolean) {
  const existing = document.getElementById('gantt-dark-theme')
  if (existing) existing.remove()
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
    .gantt .bar-label, .gantt .bar-label.big { fill: #E2E8F0 !important; font-size: 11px !important; font-weight: 500; }
    .gantt .lower-text, .gantt .upper-text { fill: #A8B5C8 !important; font-size: 10px !important; font-weight: 600; letter-spacing: 0.05em; }
    .gantt .bar-wrapper .bar { fill: #0D9488 !important; stroke: #14B8A6 !important; }
    .gantt .bar-wrapper .bar-progress { fill: #14B8A6 !important; }
    .gantt .bar-wrapper.active .bar { fill: #4F46E5 !important; stroke: #6366F1 !important; }
    .gantt .bar-wrapper.active .bar-progress { fill: #6366F1 !important; }
    .gantt .handle { fill: #fff !important; opacity: 0.6; }
    ${showCritical ? `
    .gantt .bar-wrapper.bar-critical .bar { fill: #EA580C !important; stroke: #F97316 !important; }
    .gantt .bar-wrapper.bar-critical .bar-progress { fill: #F97316 !important; }
    .gantt .bar-wrapper.bar-critical .bar-label { fill: #FED7AA !important; }
    ` : `
    .gantt .bar-wrapper.bar-critical .bar { fill: #0D9488 !important; stroke: #14B8A6 !important; }
    `}
  `
  document.head.appendChild(style)
}