import type { TimelineTask } from './schema'

/** CSV-escape a single cell: quote when it contains a delimiter, quote, or newline. */
function escapeCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

/**
 * Serialize canonical tasks to CSV (DESIGN.md §3: export must use current
 * canonical state, not the original parse input). BOM prefix so Excel opens
 * UTF-8 (Indonesian task names) correctly.
 */
export function tasksToCSV(tasks: TimelineTask[]): string {
  const header = ['name', 'assignee', 'start', 'end', 'durationDays', 'progress', 'dependsOn', 'isMilestone', 'isCritical']
  const lines = [header.join(',')]
  for (const t of tasks) {
    lines.push(
      [
        escapeCell(t.name),
        escapeCell(t.assignee ?? ''),
        t.start,
        t.end,
        String(t.durationDays),
        String(t.progress ?? 0),
        escapeCell(t.dependsOn ?? ''),
        t.isMilestone ? 'true' : 'false',
        t.isCritical ? 'true' : 'false',
      ].join(','),
    )
  }
  return `\uFEFF${lines.join('\n')}\n`
}

/** Trigger a browser download of the given text as UTF-8 CSV. */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}