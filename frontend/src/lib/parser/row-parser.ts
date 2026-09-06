// Row parser — combines date + duration grammar per field into canonical TimelineTask[]

import { parseDate, formatDateISO } from './date-grammar'
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

  // Parse start date — a BLANK start is legal: every downstream branch below
  // back-solves it (end+duration, end-only) or falls back to referenceDate.
  // Only a non-empty unparseable value is an error. (Previously blank start
  // hard-errored => any table row where the user never touched the native
  // date input blocked the ENTIRE chart from rendering.)
  let startDate: Date | null = null
  if (!row.start || row.start.trim() === '') {
    if (!hasEnd && !hasDuration) {
      // nothing to go on: fall through to the "single-day task today" default
      warnings.push('Tanggal mulai kosong — dijadwalkan hari ini')
    }
  } else {
    const parsed = parseDate(row.start, referenceDate)
    if (parsed.ok) {
      startDate = parsed.value
    } else {
      errors.push(parsed.error)
    }
  }

  // Resolve start + duration/end
  // hasDur: 0-day is a valid milestone, so truthiness of durationDays is NOT a
  // proxy for "provided" — check null explicitly.
  const hasDur = durationDays !== null
  // Inclusive span offset; milestone (0 days) collapses end onto start.
  const spanOf = (d: number) => Math.max(0, d - 1)
  if (startDate && endDate && !hasDur) {
    // end -> compute duration
    if (endDate >= startDate) {
      durationDays = dateDiffDays(startDate, endDate)
    } else {
      errors.push('End date is before start date')
    }
  } else if (endDate && !startDate && hasDur) {
    // no start but end+duration given -> back-compute start
    startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - spanOf(durationDays!))
  } else if (startDate && hasDur && endDate) {
    // all three provided — validate consistency
    const computedEnd = new Date(startDate!)
    computedEnd.setDate(computedEnd.getDate() + spanOf(durationDays!))
    if (formatDateISO(computedEnd) !== formatDateISO(endDate)) {
      warnings.push(`Duration (${durationDays}d) and end date (${formatDateISO(endDate)}) disagree; using duration`)
    }
    endDate = computedEnd
  } else if (startDate && hasDur) {
    // start + duration -> compute end
    endDate = new Date(startDate!)
    endDate.setDate(endDate.getDate() + spanOf(durationDays!))
  } else if (startDate && endDate) {
    durationDays = 1
  } else if (startDate) {
    // start only — default 1 day
    durationDays = 1
    endDate = new Date(startDate!)
  } else if (endDate) {
    // end only, no duration — minimal 1-day task ending at end
    durationDays = 1
    startDate = new Date(endDate!)
  } else if (hasDur) {
    // duration only — start today (milestone => checkpoint today)
    startDate = new Date(referenceDate)
    endDate = new Date(referenceDate)
    endDate.setDate(endDate.getDate() + spanOf(durationDays!))
  } else {
    // nothing meaningful — single-day task today
    startDate = new Date(referenceDate)
    durationDays = 1
    endDate = new Date(referenceDate)
  }

  // Validate non-negative duration (0 is allowed: milestone checkpoint)
  if (durationDays !== null && durationDays < 0) {
    errors.push('Duration must be at least 0 days')
    durationDays = 0
    endDate = new Date(startDate!)
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