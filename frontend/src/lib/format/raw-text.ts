import type { ParseRowState } from '@/lib/schema'

/**
 * Parse a block of raw text into ParseRowState[].
 * Supports:
 *   pipe:  Task | PIC | 10 Sep | 3 hari
 *   tab:   (paste from spreadsheet, auto-detect)
 *   comma: Task, PIC, 10 Sep, 3 hari
 *
 * First line may be a header row — auto-skip if it contains heading-like labels.
 */

const HEADER_PATTERN = /^(task|name|pic|assignee|lead|owner|start|date|mulai|durasi|duration|end|selesai|status|dep|ket|predecessor)/i

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
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `row-${crypto.randomUUID().slice(0, 8)}`
    }
  } catch { /* fall through */ }
  return `row-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`
}

/**
 * Check whether a line has enough delimiters to be treated as a structured row.
 * Returns the separator character if found, null otherwise.
 */
function lineHasDelimiter(line: string): string | null {
  if ((line.match(/\|/g) || []).length >= 1) return '|'
  if ((line.match(/\t/g) || []).length >= 1) return '\t'
  if ((line.match(/,/g) || []).length >= 2) return ','
  return null
}

const DATE_PATTERN = /\b(besok|lusa|hari ini|today|tomorrow|senin depan|selasa depan|rabu depan|kamis depan|jumat depan|sabtu depan|minggu depan|\d{1,2}\s+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})\b/i
const DUR_PREFIX_PATTERN = /\b(?:selama|durasi:?)\s+(\d+\s*(?:hari|day|days|minggu|week|weeks|hr|d|w)?)\b/i
const DUR_PATTERN = /\b(\d+\s*(?:hari|day|days|minggu|week|weeks|hr|d|w))\b/i
const PIC_KEYWORD_PATTERN = /\b(?:oleh|assignee:|lead:|pic:)\s+([a-zA-Z0-9_\-.]+)/i
const PIC_AT_PATTERN = /@([a-zA-Z0-9_\-.]+)/
const DEP_PATTERN = /\b(?:setelah|after|depends on|dep:)\s+([a-zA-Z0-9_\-\s]+)$/i

/**
 * Extract structured task fields from a freeform natural-language line.
 * Strips matched tokens progressively — what remains is the task name.
 */
function parseFreeformLine(raw: string): { name: string; assignee: string; start: string; duration: string; end: string; dependsOn: string } {
  let text = raw.replace(/^[-*•\d.]+\s*/, '')
  let assignee = ''
  let duration = ''
  let start = ''
  let dependsOn = ''

  // 1. Assignee
  const picMatch = text.match(PIC_KEYWORD_PATTERN)
  if (picMatch) {
    assignee = picMatch[1]
    text = text.replace(picMatch[0], ' ')
  } else {
    const atMatch = text.match(PIC_AT_PATTERN)
    if (atMatch) {
      assignee = atMatch[1]
      text = text.replace(atMatch[0], ' ')
    }
  }

  // 2. Duration (prefer prefixed "selama 3 hari" over bare "3 hari")
  const durPrefixMatch = text.match(DUR_PREFIX_PATTERN)
  if (durPrefixMatch) {
    duration = durPrefixMatch[1].trim()
    text = text.replace(durPrefixMatch[0], ' ')
  } else {
    const durMatch = text.match(DUR_PATTERN)
    if (durMatch) {
      duration = durMatch[1].trim()
      text = text.replace(durMatch[0], ' ')
    }
  }

  // 3. Start date or relative keyword
  const dateMatch = text.match(DATE_PATTERN)
  if (dateMatch) {
    start = dateMatch[1].trim()
    text = text.replace(dateMatch[0], ' ')
  }

  // 4. Dependencies
  const depMatch = text.match(DEP_PATTERN)
  if (depMatch) {
    dependsOn = depMatch[1].trim()
    text = text.replace(depMatch[0], ' ')
  }

  const name = text.replace(/\s+/g, ' ').trim()
  return { name, assignee, start, duration, end: '', dependsOn }
}

export function parseRawText(text: string): ParseRowState[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return []

  // Detect separator from first line for the structured-column path
  const globalSep = detectSeparator(lines[0])
  let startIdx = 0

  if (globalSep && isHeaderRow(splitLine(lines[0], globalSep))) {
    startIdx = 1
  }

  const rows: ParseRowState[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i]
    const lineSep = lineHasDelimiter(raw)

    if (lineSep) {
      // Structured row: split by detected delimiter.
      // Column order: name | assignee | start | duration | end
      //   [dependsOn] [progress] — trailing optional columns, in this order.
      const cells = raw.split(lineSep).map(s => s.trim())
      const name     = cells[0] || ''
      const assignee = cells[1] || ''
      const start    = cells[2] || ''
      const duration = cells[3] || ''
      const end      = cells[4] || ''
      const depends  = cells[5] || ''
      const progress = parseProgressCell(cells[6] || '')

      rows.push({
        id: generateId(),
        name: name.replace(/^[-*]\s*/, ''),
        assignee,
        start,
        duration,
        end,
        dependsOn: depends,
        progress,
      })
    } else {
      // Freeform natural-language line
      const extracted = parseFreeformLine(raw)
      rows.push({
        id: generateId(),
        name: extracted.name,
        assignee: extracted.assignee,
        start: extracted.start,
        duration: extracted.duration,
        end: extracted.end,
        dependsOn: extracted.dependsOn,
        progress: '',
      })
    }
  }

  return rows
}

/**
 * Serialize editable rows back to the pipe format the raw-text editor shows.
 * Column order matches parseRawText: name | assignee | start | duration | end
 *   [dependsOn] [progress]. Trailing columns are only emitted when needed so
 * plain schedules stay clean — but progress is round-tripped, otherwise the
 * debounced auto-parse would silently reset slider/inspector edits to 0.
 */
export function rowsToRawText(rows: ParseRowState[]): string {
  const hasDepends = rows.some(r => r.dependsOn && r.dependsOn.trim().length > 0)
  const hasProgress = rows.some(r => (parseInt(r.progress || '0', 10) || 0) > 0)
  return rows
    .filter(r => r.name.trim() || r.start.trim() || r.end.trim())
    .map(r => {
      const cols = [r.name || '-', r.assignee || '', r.start || '', r.duration || '', r.end || '']
      if (hasDepends || hasProgress) {
        cols.push(r.dependsOn || '')
      }
      if (hasProgress) {
        const n = Math.max(0, Math.min(100, parseInt(r.progress || '0', 10) || 0))
        cols.push(`${n}%`)
      }
      return cols.join(' | ')
    })
    .join('\n')
}

/** Accept "70" / "70%" (writer emits the latter); anything else → ''. */
function parseProgressCell(cell: string): string {
  const m = /^\s*(\d{1,3})\s*%?\s*$/.exec(cell || '')
  if (!m) return ''
  return `${Math.max(0, Math.min(100, parseInt(m[1], 10)))}`
}