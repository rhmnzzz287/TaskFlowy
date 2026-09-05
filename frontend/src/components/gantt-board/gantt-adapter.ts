import { TimelineTask, GanttTask } from '@/lib/schema'

export function toGanttTasks(tasks: TimelineTask[], selectedAssignees: string[]): GanttTask[] {
  const filtered = selectedAssignees.length > 0
    ? tasks.filter(t => t.assignee && selectedAssignees.includes(t.assignee))
    : tasks

  return filtered.map(t => ({
    id: t.id,
    name: t.assignee ? `${t.name} [${t.assignee}]` : t.name,
    start: t.start,
    end: t.end,
    progress: t.progress ?? 0,
    custom_class: t.isCritical ? 'bar-critical' : t.isMilestone ? 'bar-milestone' : '',
  }))
}

export interface GanttOptions {
  element: HTMLElement
  tasks: GanttTask[]
  onDateChange: (id: string, newStart: Date, newEnd: Date) => void
  onClick: (id: string) => void
}

import FrappeGantt from 'frappe-gantt'

export async function initGantt(opts: GanttOptions): Promise<any | null> {
  const { element, tasks, onDateChange, onClick } = opts

  try {
    const ganttTasks = tasks.map(t => ({ ...t, dependencies: '' }))

    const gantt = new FrappeGantt(element, ganttTasks, {
      view_mode: 'Day',
      date_format: 'YYYY-MM-DD',
      bar_height: 28,
      bar_corner_radius: 4,
      padding: 18,
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