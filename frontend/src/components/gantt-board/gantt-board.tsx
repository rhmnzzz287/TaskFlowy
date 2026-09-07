'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { TimelineTask } from '@/lib/schema'
import { toGanttTasks, initGantt, ensureTimelineOverflow } from './gantt-adapter'
import { formatDateISO } from '@/lib/parser/date-grammar'
import type { SimulatedTaskDiff } from '@/lib/simulation/slippage-engine'

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
  zoom?: number  // 1-5, timeline zoom: multiplies the time-column width
  generationTick?: number
  /** Task NAME to reveal (scroll to) when the task set changes. Names are
   *  used because task ids regenerate on every parse. Null = first bar. */
  focusTaskName?: string | null
  simulatedDiffs?: Map<string, SimulatedTaskDiff> | null
}

// Base time-column widths mirror frappe-gantt's per-mode defaults so zoom 3
// (factor 1) renders exactly like an un-zoomed chart.
const BASE_COLUMN_WIDTH: Record<'Day' | 'Week' | 'Month', number> = {
  Day: 50,
  Week: 150,
  Month: 120,
}
const ZOOM_FACTORS = [0.7, 0.85, 1, 1.4, 1.8]

export const GanttBoard = forwardRef<GanttBoardHandle, GanttBoardProps>(
  function GanttBoard({ tasks, selectedAssignees, onTasksChange, onSelectTask, viewMode = 'Week', showCritical = true, zoom = 3, generationTick = 0, focusTaskName = null, simulatedDiffs = null }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastRenderRef = useRef<string>('')
  // A mid-drag setTasks() from frappe's date_change must NOT re-init the chart:
  // el.innerHTML='' detaches the svg, which kills the pointer chain and aborts
  // the user's drag (v1.2 binds move/up on that svg). While a bar/handle drag
  // is active, re-init is skipped; the mouseup tick below re-runs the effect
  // so the chart commits exactly once on release.
  const draggingRef = useRef(false)
  const [commitTick, setCommitTick] = useState(0)

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (t?.closest?.('.bar-wrapper, .handle')) draggingRef.current = true
    }
    const up = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      setCommitTick(n => n + 1)
    }
    const el = containerRef.current
    el?.addEventListener('mousedown', down)
    document.addEventListener('mouseup', up)
    return () => {
      el?.removeEventListener('mousedown', down)
      document.removeEventListener('mouseup', up)
    }
  }, [])
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
        // Frappe passes end as (inclusive-end minus 1 second), so comparing
        // raw Date objects inflates a dragged 1-day bar to 2 days. Compare on
        // calendar dates instead. Milestones keep their 0-day checkpoint.
        const durationDays = t.isMilestone
          ? 0
          : Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
        return { ...t, start, end: t.isMilestone ? start : end, durationDays }
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

  const handleProgressChange = useCallback(
    (id: string, progress: number) => {
      // Frappe's own progress handle (the dot on each bar): commit the
      // dragged value into state so fills, tables and exports follow it.
      const updated = tasks.map(t => (t.id === id ? { ...t, progress } : t))
      onTasksChange(updated)
    },
    [tasks, onTasksChange],
  )

  // Expose scroll controls via ref.
  // NOTE: with the upstream frappe-gantt.css loaded, .gantt-container is
  // the real scroller (overflow:auto + explicit height). All scroll ops
  // target it, falling back to the outer wrapper when it isn't mounted yet.
  const getScroller = useCallback((): HTMLElement | null => {
    const outer = scrollRef.current
    if (!outer) return null
    return (outer.querySelector('.gantt-container') as HTMLElement | null) || outer
  }, [])

  // Expose scroll controls via ref
  useImperativeHandle(ref, () => ({
    scrollLeft: (px: number) => {
      const sc = getScroller()
      if (sc) sc.scrollLeft += px
    },
    scrollToToday: () => {
      const sc = getScroller()
      if (!sc) return
      // frappe-gantt v1.2 renders today as a DOM overlay div (.current-highlight)
      // positioned with inline left/top/height — not an SVG .today-highlight rect.
      const today = sc.querySelector('.current-highlight') as HTMLElement | null
      if (today) {
        const x = today.offsetLeft
        sc.scrollTo({
          left: Math.max(0, x - sc.clientWidth / 2 + 50),
          behavior: 'smooth',
        })
      }
    },
    getContainer: () => scrollRef.current,
  }), [getScroller])

  // Re-init Gantt when tasks, filter, viewMode, or showCritical change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (draggingRef.current) return // hold off until mouseup tick re-runs this

    const ganttTasks = toGanttTasks(tasks, selectedAssignees)
    // Render key must cover EVERYTHING frappe paints: dates, names (labels
    // embed assignee), progress fills, critical/milestone classes — plus the
    const minColWidth = viewMode === 'Week' ? 105 : viewMode === 'Month' ? 80 : 35
    const columnWidth = Math.max(
      minColWidth,
      Math.round((BASE_COLUMN_WIDTH[viewMode] ?? 50) * (ZOOM_FACTORS[zoom - 1] ?? 1)),
    )
    const renderKey = JSON.stringify([ganttTasks.map(t => [t.id, t.start, t.end, t.name, t.progress, t.custom_class || '', t.dependencies || '']), viewMode, columnWidth, generationTick])

    if (renderKey === lastRenderRef.current) {
      return
    }
    lastRenderRef.current = renderKey

    if (ganttTasks.length === 0) {
      el.innerHTML =
        '<div class="flex items-center justify-center h-40 text-muted text-[13px]">No tasks. Add rows and generate to build your timeline.</div>'
      return
    }

    const prevScroller = el.querySelector('.gantt-container') as HTMLElement | null
    const prevScrollLeft = prevScroller ? prevScroller.scrollLeft : 0
    // Zoom-anchor: keep the viewport glued to the FIRST bar (task with the
    // earliest start — the chart is sorted chronologically, so DOM bar #1 is
    // the earliest task). Storing an offset relative to that anchor (instead
    // of absolute px) survives columnWidth changes: zooming in/out scales the
    // anchor's x, and we re-derive the scroll from the NEW anchor position,
    // so the view never jumps away from the earliest task.
    const readAnchorX = (root: HTMLElement): number => {
      const bar = root.querySelector('.bar-wrapper .bar') as SVGRectElement | null
      if (!bar) return 0
      const x = parseFloat(bar.getAttribute('x') || '')
      return Number.isFinite(x) ? x : 0
    }
    const oldAnchorX = readAnchorX(el)
    el.innerHTML = ''
    // prevScrollLeft/oldAnchorX are restored below on zoom-only re-inits so
    // zooming doesn't yank the viewport back to day one.

    let cancelled = false
    const taskSig = JSON.stringify([ganttTasks.map(t => t.id), viewMode])
    initGantt({
      element: el,
      tasks: ganttTasks,
      onDateChange: handleDateChange,
      onClick: handleClick,
      onProgressChange: handleProgressChange,
      viewMode,
      columnWidth,
    }).then(
      (gantt) => {
        if (!cancelled) {
          if (!gantt) {
            // initGantt swallows constructor errors and resolves null —
            // previously the container stayed blank with no feedback.
            el.innerHTML =
              '<div class="flex items-center justify-center h-40 text-error text-[13px] px-4 text-center">Chart gagal diinisialisasi. Coba muat ulang atau periksa format tanggal.</div>'
            return
          }
          // Guarantee a scrollable timeline: at high compression the date
          // domain can fit inside the viewport, leaving a dead void with no
          // continuation. Must run BEFORE the scroll-to-bar logic below,
          // which measures the final bar positions.
          const scrollerEl = scrollRef.current?.querySelector('.gantt-container') as HTMLElement | null
          if (scrollerEl) ensureTimelineOverflow(gantt, scrollerEl)
          if (taskSig !== lastTaskSigRef.current) {
            lastTaskSigRef.current = taskSig
            // Reveal the focused (new/renamed) task; fall back to the first
            // bar, then the today marker. Bars carry data-id = task id, so a
            // name lookup through tasks[] lands exactly even though frappe
            // appends "[assignee]" to the painted label.
            requestAnimationFrame(() => {
              const scroller = (scrollRef.current?.querySelector('.gantt-container') as HTMLElement | null) || scrollRef.current
              if (!scroller) return
              let x: number | null = null
              if (focusTaskName) {
                const target = tasks.find(t => t.name === focusTaskName)
                const barEl = target
                  ? (el.querySelector(`.bar-wrapper[data-id="${target.id}"] .bar`) as SVGRectElement | null)
                  : null
                if (barEl) x = parseFloat(barEl.getAttribute('x') || '')
              }
              if (x === null || !Number.isFinite(x)) {
                const firstBar = el.querySelector('.bar-wrapper .bar') as SVGRectElement | null
                if (firstBar) x = parseFloat(firstBar.getAttribute('x') || '')
              }
              if (!Number.isFinite(x as number | null)) {
                const today = el.querySelector('.current-highlight') as HTMLElement | null
                if (today) x = today.offsetLeft
              }
              if (x !== null && Number.isFinite(x)) scroller.scrollLeft = Math.max(0, x - 40)
            })
          } else if (prevScrollLeft > 0) {
            // Same task set (view-mode/zoom change): keep the viewport where
            // the user was — re-anchored so the EARLIEST task stays in view.
            // (Column widths changed, so raw px would land the user far from
            // the task; re-derive from the new anchor position.)
            requestAnimationFrame(() => {
              const scroller = (scrollRef.current?.querySelector('.gantt-container') as HTMLElement | null) || scrollRef.current
              if (!scroller) return
              const newAnchorX = readAnchorX(el)
              scroller.scrollLeft = Math.max(0, prevScrollLeft + (newAnchorX - oldAnchorX))
            })
          }
        }
      },
    ).catch((e) => {
      if (!cancelled) {
        console.error('Gantt render failed:', e)
        el.innerHTML = `<div class="flex items-center justify-center h-40 text-error text-[13px]">Chart gagal dirender: ${(e as Error)?.message || e}</div>`
      }
    })

    return () => {
      cancelled = true
    }
    // showCritical no longer re-renders the chart — it only toggles a CSS class now
  }, [tasks, selectedAssignees, handleDateChange, handleClick, handleProgressChange, viewMode, zoom, commitTick, generationTick, focusTaskName])

  // Render / synchronize Ghost Bars for What-If Slippage Simulation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const svg = el.querySelector('svg.gantt') as SVGSVGElement | null
    if (!svg) return

    const oldLayer = svg.querySelector('.ghost-bars-layer')
    if (oldLayer) oldLayer.remove()

    if (!simulatedDiffs || simulatedDiffs.size === 0) return

    let defs = svg.querySelector('defs')
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      svg.insertBefore(defs, svg.firstChild)
    }
    if (!defs.querySelector('#ghost-stripe-pattern')) {
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
      pattern.setAttribute('id', 'ghost-stripe-pattern')
      pattern.setAttribute('width', '8')
      pattern.setAttribute('height', '8')
      pattern.setAttribute('patternUnits', 'userSpaceOnUse')
      pattern.setAttribute('patternTransform', 'rotate(45)')
      pattern.innerHTML = `
        <rect width="4" height="8" fill="#f59e0b" fill-opacity="0.30" />
        <rect x="4" width="4" height="8" fill="#f59e0b" fill-opacity="0.10" />
      `
      defs.appendChild(pattern)
    }

    const ghostLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    ghostLayer.setAttribute('class', 'ghost-bars-layer')
    ghostLayer.setAttribute('style', 'pointer-events: none;')

    let pxPerDay = 0
    for (const t of tasks) {
      if (t.isMilestone || t.durationDays <= 0) continue
      const barEl = svg.querySelector(`.bar-wrapper[data-id="${t.id}"] .bar`) as SVGRectElement | null
      if (barEl) {
        const w = parseFloat(barEl.getAttribute('width') || '0')
        if (w > 0) {
          pxPerDay = w / t.durationDays
          break
        }
      }
    }
    if (pxPerDay <= 0) {
      const minColWidth = viewMode === 'Week' ? 105 : viewMode === 'Month' ? 80 : 35
      const colW = Math.max(minColWidth, Math.round((BASE_COLUMN_WIDTH[viewMode] ?? 50) * (ZOOM_FACTORS[zoom - 1] ?? 1)))
      pxPerDay = viewMode === 'Week' ? colW / 7 : viewMode === 'Month' ? colW / 30 : colW
    }

    simulatedDiffs.forEach((diff) => {
      if (diff.varianceDays === 0) return
      const barWrapper = svg.querySelector(`.bar-wrapper[data-id="${diff.taskId}"]`) as SVGGElement | null
      if (!barWrapper) return

      const bar = barWrapper.querySelector('.bar') as SVGRectElement | null
      if (!bar) return

      const origX = parseFloat(bar.getAttribute('x') || '0')
      const y = parseFloat(bar.getAttribute('y') || '0')
      const h = parseFloat(bar.getAttribute('height') || '24')
      const shiftPx = diff.varianceDays * pxPerDay
      const ghostX = origX + shiftPx
      const ghostW = parseFloat(bar.getAttribute('width') || `${pxPerDay}`)

      if (diff.isMilestone) {
        const size = h * 0.8
        const cx = ghostX
        const cy = y + h / 2
        const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
        diamond.setAttribute('points', `${cx},${cy - size / 2} ${cx + size / 2},${cy} ${cx},${cy + size / 2} ${cx - size / 2},${cy}`)
        diamond.setAttribute('fill', '#f59e0b')
        diamond.setAttribute('fill-opacity', '0.4')
        diamond.setAttribute('stroke', '#f59e0b')
        diamond.setAttribute('stroke-width', '1.5')
        diamond.setAttribute('stroke-dasharray', '3 2')
        ghostLayer.appendChild(diamond)

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', `${cx + size / 2 + 6}`)
        text.setAttribute('y', `${cy + 4}`)
        text.setAttribute('fill', '#f59e0b')
        text.setAttribute('font-family', 'monospace')
        text.setAttribute('font-size', '11')
        text.setAttribute('font-weight', '600')
        text.textContent = diff.varianceDays > 0 ? `+${diff.varianceDays}d ⚠️` : `${diff.varianceDays}d`
        ghostLayer.appendChild(text)
      } else {
        const ghostRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        ghostRect.setAttribute('x', `${ghostX}`)
        ghostRect.setAttribute('y', `${y - 2}`)
        ghostRect.setAttribute('width', `${ghostW}`)
        ghostRect.setAttribute('height', `${h + 4}`)
        ghostRect.setAttribute('rx', '3')
        ghostRect.setAttribute('ry', '3')
        ghostRect.setAttribute('fill', 'url(#ghost-stripe-pattern)')
        ghostRect.setAttribute('stroke', '#f59e0b')
        ghostRect.setAttribute('stroke-width', '1.5')
        ghostRect.setAttribute('stroke-dasharray', '4 2')
        ghostLayer.appendChild(ghostRect)

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', `${ghostX + ghostW + 6}`)
        text.setAttribute('y', `${y + h / 2 + 4}`)
        text.setAttribute('fill', '#f59e0b')
        text.setAttribute('font-family', 'monospace')
        text.setAttribute('font-size', '11')
        text.setAttribute('font-weight', '600')
        text.textContent = diff.varianceDays > 0 ? `+${diff.varianceDays}d` : `${diff.varianceDays}d`
        ghostLayer.appendChild(text)
      }
    })

    svg.appendChild(ghostLayer)
  }, [simulatedDiffs, tasks, viewMode, zoom])

  return (
    <div className="flex-1 bg-surface-dim dark:bg-[#0B0F19] rounded-none border-none overflow-hidden flex flex-col min-h-0">
      <div
        ref={scrollRef}
        className={`gantt-wrapper flex-1 overflow-hidden relative${showCritical ? ' show-critical' : ''}`}
        style={{ minHeight: '280px' }}
      >
        <div ref={containerRef} />
      </div>
    </div>
  )
})
