declare module 'frappe-gantt' {
  interface GanttTaskInput {
    id: string
    name: string
    start: string
    end: string
    progress: number
    dependencies?: string
    custom_class?: string
  }

  interface GanttOptions {
    view_mode?: 'Day' | 'Week' | 'Month' | 'Quarter Year' | 'Half Year'
    date_format?: string
    bar_height?: number
    bar_corner_radius?: number
    arrow_curve?: number
    padding?: number
    language?: string
    /** false disables the built-in tooltip popup (pointer-events: none rule
     *  ships with frappe-gantt.css, which this app does NOT import). */
    popup?: false | ((task: unknown) => string)
    on_date_change?: (task: { id: string }, start: Date, end: Date) => void
    on_click?: (task: unknown) => void
    on_contextmenu?: (task: unknown) => void
  }

  class Gantt {
    constructor(
      wrapper: string | HTMLElement,
      tasks: GanttTaskInput[],
      options?: GanttOptions,
    )
    change_view_mode(mode: string): void
    scroll_today(): void
    trigger_event(event: string, args: unknown[]): void
  }

  export default Gantt
}