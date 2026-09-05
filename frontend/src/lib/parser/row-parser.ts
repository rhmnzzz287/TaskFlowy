// Row parser — combines date + duration grammar per field into canonical TimelineTask[]

import { parseDate, formatDateISO, DateResult } from './date-grammar'
import { parseDuration } from './duration-grammar'
import { ParseRowInput, TimelineTask, createTaskId, dateDiffDays } from '../schema'

export interface RowParseResult {
  task: TimelineTask
  errors: string[]
  warnings: string[]
}

export interface BatchParseResult {
  tasks: TimelineTask[]
  warnings: string[]
  errors: Record<string, string[]> // row index -> errors
}

export function parseRow(
  row: ParseRowInput,
  index: number,
  referenceDate: string,
): RowParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const name = row.name.trim()

  if (!name) {
    errors.push('Task name is required')
  }

  // Parse start date
  let startDate: Date | null = null
  if (!row.start || row.start.trim() === '') {
    errors.push('Start date is required')
  } else {
    const parsed = parseDate(row.start, referenceDate)
    if (parsed.ok) {
      startDate = parsed.value
    } else {
      errors.push(parsed.error)
    }
  }

  // Parse duration
  let durationDays: number | null = null
  const hasDuration = row.duration && row.duration.trim() !== ''
  const hasEnd = row.end && row.end.trim() !== ''

  if (hasDuration) {
    const durResult = parseDuration(row.duration)
    if (durResult.ok) {
      durationDays = durResult.days
    } else {
      errors.push(durResult.error)
    }
  }

  // Parse end date (alternative to duration)
  let endDate: Date | null = null
  if (hasEnd) {
    const parsed = parseDate(row.end!, referenceDate)
    if (parsed.ok) {
      endDate = parsed.value
    } else {
      errors.push(parsed.error)
    }
  }

  // Resolve start + duration/end
  if (startDate) {
    if (durationDays && !endDate) {
      // duration -> compute end
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + durationDays - 1)
    } else if (endDate && !durationDays) {
      // end -> compute duration
      if (endDate >= startDate) {
        durationDays = dateDiffDays(startDate, endDate)
      } else {
        errors.push('End date is before start date')
      }
    } else if (durationDays && endDate) {
      // both provided — validate consistency
      const computedEnd = new Date(startDate)
      computedEnd.setDate(computedEnd.getDate() + durationDays - 1)
      if (formatDateISO(computedEnd) !== formatDateISO(endDate)) {
        warnings.push(`Duration (${durationDays}d) and end date (${formatDateISO(endDate)}) disagree; using duration`)
      }
      endDate = computedEnd
    } else {
      // neither — default 1 day
      durationDays = 1
      endDate = new Date(startDate)
    }

    // Validate minimum duration
    if (durationDays !== null && durationDays < 1) {
      errors.push('Duration must be at least 1 day')
      durationDays = 1
      endDate = new Date(startDate)
    }
  }

  const task: TimelineTask = {
    id: createTaskId(),
    name: name || `Row ${index + 1}`,
    assignee: row.assignee?.trim() || null,
    start: startDate ? formatDateISO(startDate) : referenceDate,
    end: endDate ? formatDateISO(endDate) : referenceDate,
    durationDays: durationDays ?? 1,
    ambiguities: [],
  }

  // Set end=start if we have no valid date at all
  if (!startDate && !endDate) {
    task.start = referenceDate
    task.end = referenceDate
    task.durationDays = 1
  } else if (startDate && !endDate) {
    task.end = task.start
    task.durationDays = 1
  }

  return { task, errors, warnings }
}

export function parseRows(
  rows: ParseRowInput[],
  referenceDate: string,
): BatchParseResult {
  const tasks: TimelineTask[] = []
  const warnings: string[] = []
  const errors: Record<string, string[]> = {}

  rows.forEach((row, i) => {
    const result = parseRow(row, i, referenceDate)
    if (result.errors.length > 0) {
      errors[String(i)] = result.errors
    }
    result.warnings.forEach(w => warnings.push(`Row ${i + 1}: ${w}`))
    tasks.push(result.task)
  })

  return { tasks, warnings, errors }
}

export function validateTaskConsistency(tasks: TimelineTask[]): string[] {
  const issues: string[] = []
  tasks.forEach(t => {
    const start = new Date(t.start)
    const end = new Date(t.end)
    if (end < start) {
      issues.push(`Task "${t.name}": end (${t.end}) before start (${t.start})`)
    }
    if (t.durationDays < 1) {
      issues.push(`Task "${t.name}": duration ${t.durationDays}d < 1`)
    }
  })
  return issues
}