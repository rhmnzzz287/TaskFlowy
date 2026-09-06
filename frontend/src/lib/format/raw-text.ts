import type { ParseRowState, TimelineTask } from '@/lib/schema'
import { formatDateDisplay } from '@/lib/parser/date-grammar'

/**
 * Parse a block of raw text into ParseRowState[].
 * Supports:
 *   pipe:  Task | PIC | 10 Sep | 3 hari
 *   tab:   (paste from spreadsheet, auto-detect)
 *   comma: Task, PIC, 10 Sep, 3 hari
 *
 * First line may be a header row — auto-skip if it contains heading-like labels.
 */

const HEADER_PATTERN = /^(task|name|pic|assignee|lead|owner|start|date|mulai|durasi|duration|end|selesai|status)/i

function detectSeparator(line: string): string | null {
  const pipeCount = (line.match(/\|/g) || []).length
  const tabCount  = (line.match(/\t/g) || []).length
  const commaCount = (line.match(/,/g) || []).length
  if (pipeCount >= 3) return '|'
  if (tabCount >= 3) return '\t'
  if (commaCount >= 3) return ','
  return null
}

function splitLine(line: string, sep: string): string[] {
  return line.split(sep).map(s => s.trim())
}

function isHeaderRow(cells: string[]): boolean {
  // Only treat the line as a header when MOST cell values are header words —
  // a single accidental prefix match must not swallow a real data row.
  const hits = cells.filter(c => HEADER_PATTERN.test(c.trim())).length
  return hits >= 2 && hits >= cells.length - 1
}

function generateId(): string {
  return `row-${crypto.randomUUID().slice(0, 8)}`
}

export function parseRawText(text: string): ParseRowState[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return []

  const sep = detectSeparator(lines[0]) || '|'
  let startIdx = 0

  // auto-skip header if first line looks like heading
  if (isHeaderRow(splitLine(lines[0], sep))) {
    startIdx = 1
  }

  const rows: ParseRowState[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i]
    // Try pipe first; if fewer than 2 separators fall back to whitespace split
    const cells = raw.includes('|')
      ? raw.split('|').map(s => s.trim())
      : raw.includes('\t')
        ? raw.split('\t').map(s => s.trim())
        : raw.split(',').map(s => s.trim())

    const name     = cells[0] || ''
    const assignee = cells[1] || ''
    const start    = cells[2] || ''
    const duration = cells[3] || ''
    const end      = cells[4] || ''
    const depends  = cells[5] || ''

    rows.push({
      id: generateId(),
      name: name.replace(/^[-*]\s*/, ''),  // strip leading bullet markers
      assignee,
      start,
      duration,
      end,
      dependsOn: depends,
      progress: '',
    })
  }

  return rows
}

/**
 * Serialize editable rows back to the pipe format the raw-text editor shows.
 * Column order matches parseRawText: name | assignee | start | duration | end.
 */
export function rowsToRawText(rows: ParseRowState[]): string {
  return rows
    .filter(r => r.name.trim() || r.start.trim() || r.end.trim())
    .map(r => [r.name || '-', r.assignee, r.start, r.duration, r.end].join(' | '))
    .join('\n')
}

/**
 * Serialise timeline tasks back to a pipe-aligned text representation.
 */
export function tasksToRawText(tasks: TimelineTask[]): string {
  const header = 'Task | Lead | Start | End | Durasi | Status'
  const lines = tasks.map(t => {
    const name = t.isMilestone ? `◆ ${t.name}` : t.name
    const lead = t.assignee || '-'
    const dur  = t.isMilestone ? '0' : `${t.durationDays} hr`
    const st   = t.status || 'planned'
    return `${name} | ${lead} | ${formatDateDisplay(t.start)} | ${formatDateDisplay(t.end)} | ${dur} | ${st}`
  })
  return [header, ...lines].join('\n')
}