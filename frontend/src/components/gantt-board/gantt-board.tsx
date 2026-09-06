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
  // Scroll the first paint onto the action: only when the task SET changes
  // (generate/template/load), never on date-drags — otherwise every drag
  // would yank the viewport back to day one.
  const lastTaskSigRef = useRef<string>('')

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
      // frappe-gantt v1.2 renders today as a DOM overlay div (.current-highlight)
      // positioned with inline left/top/height — not an SVG .today-highlight rect.
      const today = el.querySelector('.current-highlight') as HTMLElement | null
      if (today) {
        const x = today.offsetLeft
        el.scrollTo({
          left: Math.max(0, x - el.clientWidth / 2 + 50),
          behavior: 'smooth',
        })
      }
    },
    getContainer: () => scrollRef.current,
  }))

  // Re-init Gantt when tasks, filter, viewMode, or showCritical change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ganttTasks = toGanttTasks(tasks, selectedAssignees)
    const renderKey = JSON.stringify([ganttTasks.map(t => [t.id, t.start, t.end, t.dependencies || '']), viewMode, showCritical])

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
    const taskSig = JSON.stringify([ganttTasks.map(t => t.id), viewMode])
    initGantt({
      element: el,
      tasks: ganttTasks,
      onDateChange: handleDateChange,
      onClick: handleClick,
      viewMode,
    }).then(
      (gantt) => {
        if (!cancelled) {
          setLoading(false)
          applyDarkTheme(showCritical)
          if (gantt && taskSig !== lastTaskSigRef.current) {
            lastTaskSigRef.current = taskSig
            // frappe-gantt v1.2.2 pads gantt_start ~3 weeks before the first
            // task; without its own stylesheet its internal scroll_to is a
            // no-op here, so first paint showed only empty grid columns.
            // Scroll our wrapper onto the first bar (fallback: today marker).
            const scale = 0.6 + (zoom - 1) * 0.2
            requestAnimationFrame(() => {
              const wrapper = scrollRef.current
              if (!wrapper) return
              let x: number | null = null
              const firstBar = el.querySelector('.bar-wrapper .bar') as SVGRectElement | null
              if (firstBar) x = parseFloat(firstBar.getAttribute('x') || '')
              if (!Number.isFinite(x as number | null)) {
                const today = el.querySelector('.current-highlight') as HTMLElement | null
                if (today) x = today.offsetLeft
              }
              if (x !== null && Number.isFinite(x)) wrapper.scrollLeft = Math.max(0, x * scale - 40)
            })
          }
        }
      },
    ).catch((e) => {
      if (!cancelled) {
        setLoading(false)
        console.error('Gantt render failed:', e)
        el.innerHTML = `<div class="flex items-center justify-center h-40 text-error text-[13px]">Chart gagal dirender: ${(e as Error)?.message || e}</div>`
      }
    })

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
      border: none !important;
    }
    .gantt .grid-background { fill: #0F172A !important; }
    .gantt .grid-header { fill: #1E293B !important; stroke: #334155 !important; }
    .gantt .grid-row { fill: #0F172A !important; }
    .gantt .grid-row:nth-child(even) { fill: #131B2E !important; }
    .gantt .row-line { stroke: #334155 !important; }
    .gantt .tick { stroke: #334155 !important; }
    /* Today marker styling lives in globals.css (.gantt-container .current-highlight) */
    .gantt .arrow { stroke: #64748B !important; fill: none !important; }
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