// Canonical types — matches SCHEMA.md

export interface ParseRowInput {
  name: string
  assignee?: string | null
  start: string
  duration?: string | null
  end?: string | null
}

export interface TimelineTask {
  id: string
  name: string
  assignee: string | null
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
  durationDays: number
  dependsOn?: string | null
  ambiguities: string[]
}

export interface ParseTimelineRequest {
  rows: ParseRowInput[]
  referenceDate: string
  timezone: string
}

export interface ParseTimelineResponse {
  tasks: TimelineTask[]
  warnings: string[]
}

export interface ParseRowState {
  id: string
  name: string
  assignee: string
  start: string
  duration: string
  end: string
}

export interface TimelineState {
  inputRows: ParseRowState[]
  tasks: TimelineTask[]
  selectedAssignees: string[]
  warnings: string[]
  errors: Record<string, string>  // rowId -> error message per field
  parseStatus: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
}

export type TaskValidationError =
  | { kind: 'empty-name' }
  | { kind: 'invalid-date'; field: string; value: string }
  | { kind: 'empty-start' }
  | { kind: 'invalid-duration'; value: string }
  | { kind: 'end-before-start'; start: string; end: string }
  | { kind: 'short-duration' }
  | { kind: 'cycle-dependency'; task: string; dependsOn: string }

// Frappe Gantt adapter type
export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  custom_class?: string
}

export function createTaskId(): string {
  return `task-${crypto.randomUUID().slice(0, 8)}`
}

export function createRowId(): string {
  return `row-${crypto.randomUUID().slice(0, 8)}`
}

export const DEFAULT_TIMEZONE = 'Asia/Jakarta'

export function todayRef(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function dateDiffDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}