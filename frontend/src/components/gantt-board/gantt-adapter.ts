import { TimelineTask, GanttTask } from '@/lib/schema'

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
      custom_class: t.isCritical ? 'bar-critical' : t.isMilestone ? 'bar-milestone' : '',
    }
  })
}

export interface GanttOptions {
  element: HTMLElement
  tasks: GanttTask[]
  onDateChange: (id: string, newStart: Date, newEnd: Date) => void
  onClick: (id: string) => void
  viewMode?: 'Day' | 'Week' | 'Month'
}

import FrappeGantt from 'frappe-gantt'

export async function initGantt(opts: GanttOptions): Promise<any | null> {
  const { element, tasks, onDateChange, onClick, viewMode } = opts

  try {
    const gantt = new FrappeGantt(element, tasks, {
      view_mode: viewMode || 'Week',
      date_format: 'YYYY-MM-DD',
      bar_height: 28,
      bar_corner_radius: 4,
      padding: 18,
      // frappe-gantt.css is NOT imported, so its v1.2 tooltip (.gantt-popup
      // pointer-events:none) is missing: the popup spawns on mouseup right
      // under the cursor and steals the native `click` from .bar-wrapper,
      // breaking bar → Inspector selection. InspectorDrawer is our detail
      // view — disable the built-in popup entirely.
      popup: false,
      on_date_change: (_task: { id: string }, start: Date, end: Date) => {
        onDateChange(_task.id, start, end)
      },
      on_click: (task: unknown) => {
        const id = (task as { id?: string })?.id
        if (id) onClick(id)
      },
    })

    return gantt
  } catch (e) {
    console.error('Failed to init Frappe Gantt:', e)
    return null
  }
}