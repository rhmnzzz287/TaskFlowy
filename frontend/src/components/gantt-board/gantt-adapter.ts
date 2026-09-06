import { TimelineTask, GanttTask } from '@/lib/schema'

/**
 * Frappe grows its date domain infinitely on wheel-scroll, but that can only
 * trigger while content overflows its scroller. At high compression (Week
 * zoom 1: ±30 days ≈ 740px < viewport) the grid ends in a dead void with
 * nothing to scroll. Grow the domain until it overflows, using frappe's own
 * setup_date_values()+render() refresh path (mirrors its wheel handler).
 * No-op once scrollable. Bounded: 5 rounds × ±30 days.
 * (Touches frappe internals — keep the dep pinned to the verified version.)
 */
export function ensureTimelineOverflow(gantt: any, scroller: HTMLElement): void {
  try {
    if (!gantt || typeof gantt.render !== 'function' || typeof gantt.setup_date_values !== 'function') return
    if (!(gantt.gantt_start instanceof Date) || !(gantt.gantt_end instanceof Date)) return
    let guard = 0
    while (guard++ < 5 && scroller.scrollWidth <= scroller.clientWidth + 40) {
      const s = new Date(gantt.gantt_start.getTime())
      s.setDate(s.getDate() - 30)
      const e = new Date(gantt.gantt_end.getTime())
      e.setDate(e.getDate() + 30)
      gantt.gantt_start = s
      gantt.gantt_end = e
      gantt.setup_date_values()
      gantt.render()
    }
  } catch (err) {
    console.warn('Timeline overflow extension skipped:', err)
  }
}

export function toGanttTasks(tasks: TimelineTask[], selectedAssignees: string[]): GanttTask[] {
  const filtered = selectedAssignees.length > 0
    ? tasks.filter(t => t.assignee && selectedAssignees.includes(t.assignee))
    : tasks

  // Resolve predecessor NAMES (row editor binds dependsOn by name) to the task
  // IDs actually rendered in this chart; deps whose target was filtered out are
  // dropped so Frappe never references a missing node.
  const nameToId = new Map(filtered.map(t => [t.name, t.id]))
  return filtered.map(t => {
    const sourceId = t.dependsOn ? nameToId.get(t.dependsOn) : undefined
    return {
      id: t.id,
      name: t.assignee ? `${t.name} [${t.assignee}]` : t.name,
      start: t.start,
      end: t.end,
      progress: t.progress ?? 0,
      dependencies: sourceId && sourceId !== t.id ? sourceId : '',
      custom_class: (t.progress ?? 0) >= 100
        ? 'bar-completed'
        : t.isCritical ? 'bar-critical' : t.isMilestone ? 'bar-milestone' : '',
    }
  })
}

export interface GanttOptions {
  element: HTMLElement
  tasks: GanttTask[]
  onDateChange: (id: string, newStart: Date, newEnd: Date) => void
  onClick: (id: string) => void
  onProgressChange: (id: string, progress: number) => void
  viewMode?: 'Day' | 'Week' | 'Month'
  /** Pixels per time column — the real timeline zoom. Omit for frappe default. */
  columnWidth?: number
}

import FrappeGantt from 'frappe-gantt'

export async function initGantt(opts: GanttOptions): Promise<any | null> {
  const { element, tasks, onDateChange, onClick, onProgressChange, viewMode, columnWidth } = opts

  try {
    const gantt = new FrappeGantt(element, tasks, {
      view_mode: viewMode || 'Week',
      date_format: 'YYYY-MM-DD',
      bar_height: 28,
      bar_corner_radius: 4,
      padding: 18,
      // undefined falls back to frappe's per-mode default (Day 45 / Week
      // 140 / Month 120); a number stretches/squeezes the time axis.
      column_width: columnWidth,
      // InspectorDrawer is our detail view: the built-in popup would spawn on
      // mouseup right under the cursor and steal the native `click` from
      // .bar-wrapper, breaking bar → inspector selection. Disable it entirely.
      popup: false,
      on_date_change: (_task: { id: string }, start: Date, end: Date) => {
        onDateChange(_task.id, start, end)
      },
      on_click: (task: unknown) => {
        const id = (task as { id?: string })?.id
        if (id) onClick(id)
      },
      on_progress_change: (task: { id: string }, progress: number) => {
        onProgressChange(task.id, Math.max(0, Math.min(100, Math.round(progress))))
      },
    })

    return gantt
  } catch (e) {
    console.error('Failed to init Frappe Gantt:', e)
    return null
  }
}