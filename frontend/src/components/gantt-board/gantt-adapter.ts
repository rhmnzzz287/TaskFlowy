import { TimelineTask, GanttTask } from '@/lib/schema'

// Map canonical TimelineTask to Frappe Gantt's task format
export function toGanttTasks(tasks: TimelineTask[], selectedAssignees: string[]): GanttTask[] {
  const filtered = selectedAssignees.length > 0
    ? tasks.filter(t => t.assignee && selectedAssignees.includes(t.assignee))
    : tasks

  return filtered.map(t => ({
    id: t.id,
    name: t.assignee ? `${t.name} [${t.assignee}]` : t.name,
    start: t.start,
    end: t.end,
    progress: 0,
  }))
}

export interface GanttOptions {
  element: HTMLElement
  tasks: GanttTask[]
  onDateChange: (id: string, newStart: Date, newEnd: Date) => void
}

// Frappe Gantt types (minimal, since lib ships JS)
interface GanttInstance {
  change_view_mode(mode: string): void
  sidebar(element: HTMLElement, options?: unknown): void
  scroll_today(): void
  trigger_event(event: string, args: unknown[]): void
}

// Dynamic-loading the ESM build; import CSS side effect
export async function initGantt(opts: GanttOptions): Promise<GanttInstance | null> {
  const { element, tasks, onDateChange } = opts

  try {
    const [{ default: FrappeGantt }] = await Promise.all([
      import('frappe-gantt'),
    ])

    const ganttTasks = tasks.map(t => ({ ...t, dependencies: '' }))

    // eslint-disable-next-line new-cap
    const gantt = new FrappeGantt(element, ganttTasks, {
      view_mode: 'Day',
      date_format: 'YYYY-MM-DD',
      bar_height: 28,
      bar_corner_radius: 4,
      padding: 18,
      on_date_change: (task: { id: string }, start: Date, end: Date) => {
        onDateChange(task.id, start, end)
      },
    })

    return gantt as GanttInstance
  } catch (e) {
    console.error('Failed to load Frappe Gantt:', e)
    return null
  }
}