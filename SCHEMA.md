# SCHEMA: Text-to-Gantt

## 1. Canonical Task Schema

```ts
export type TimelineTask = {
  id: string
  name: string
  assignee: string | null
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  durationDays: number
  // optional: only present when dependency parsing is enabled (Phase 2+)
  dependsOn?: string | null // nullable; references another task's id or name
  ambiguities: string[]
}
```

## 2. Parse Request

```ts
export type ParseRowInput = {
  name: string
  assignee?: string | null
  start: string // raw field grammar: '10 September 2026' | 'besok' | 'after <task>'
  duration?: string | null // raw field grammar: '3 hari' | 'sampai 15 September 2026'
  end?: string | null // raw end date alternative to duration
}

export type ParseTimelineRequest = {
  rows: ParseRowInput[]
  referenceDate: string // YYYY-MM-DD
  timezone: string
}
```

## 3. Parse Response

```ts
export type ParseTimelineResponse = {
  tasks: TimelineTask[]
  warnings: string[]
}
```

## 4. Frontend State

```ts
export type ParseRowState = {
  id: string // stable row id (not the task id)
  name: string
  assignee: string
  start: string
  duration?: string
  end?: string
}

export type TimelineState = {
  inputRows: ParseRowState[]
  tasks: TimelineTask[]
  selectedAssignees: string[]
  warnings: string[]
  errors: Record<string, string> // map by row id -> field error
  parseStatus: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
}
```

## 5. CSV Schema

```text
id,name,assignee,start,end,durationDays
```

## 6. Validation Rules

- `name` must be non-empty.
- `start` and `end` must use ISO calendar dates after normalization.
- `start <= end`.
- `durationDays >= 1`.
- `durationDays = dateDiff(start, end) + 1` for calendar-day scheduling.
- `ambiguities` is always an array.
- `dependsOn` (when present) must reference an existing task id/name and must not create a cycle (when dependency resolution is enabled).

## 7. Mapping to Frappe Gantt

Internal schema should be adapted to library-specific schema in a dedicated adapter layer.

```ts
export type GanttTask = {
  id: string
  name: string
  start: string
  end: string
  progress: number
  custom_class?: string
}
```

Do not expose Frappe-specific types as the application's canonical domain model.

## 8. ID Rules

Task IDs must remain stable after visual edits.

Preferred format:
```text
task-<short-unique-id>
```

The ID must not be derived from task name because names can change and duplicate.