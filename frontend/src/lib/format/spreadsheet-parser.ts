import { ParseRowState, createRowId, todayRef } from '@/lib/schema'

export function addDaysISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

/**
 * Parse text from imported CSV, TSV, or spreadsheet export into table rows.
 */
export function parseSpreadsheetText(content: string, refDate: string = todayRef()): ParseRowState[] {
  const clean = content.replace(/^\uFEFF/, '').trim()
  if (!clean) return []

  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const firstLine = lines[0]
  const tabCount = (firstLine.match(/\t/g) || []).length
  const pipeCount = (firstLine.match(/\|/g) || []).length
  const semiCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length

  let delimiter = ','
  if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) delimiter = '\t'
  else if (pipeCount > commaCount && pipeCount > semiCount) delimiter = '|'
  else if (semiCount > commaCount) delimiter = ';'

  const parseCells = (line: string): string[] => {
    if (delimiter === '\t' || delimiter === '|') {
      return line.split(delimiter).map(c => c.trim())
    }
    const res: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delimiter && !inQuotes) {
        res.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    res.push(cur.trim())
    return res
  }

  const rawHeader = parseCells(lines[0]).map(h => h.toLowerCase())
  const hasHeader = rawHeader.some(h =>
    h.includes('task') || h.includes('tugas') || h.includes('nama') ||
    h.includes('name') || h.includes('start') || h.includes('mulai') || h.includes('dur')
  )

  const dataLines = hasHeader ? lines.slice(1) : lines
  const rows: ParseRowState[] = []

  dataLines.forEach((line, idx) => {
    const cells = parseCells(line)
    if (cells.length === 0 || !cells[0]) return

    let name = cells[0]
    let assignee = cells[1] || ''
    let start = cells[2] || addDaysISO(refDate, idx)
    let duration = cells[3] || '2 hari'
    let dependsOn = cells[4] || ''

    if (hasHeader) {
      const findIdx = (keywords: string[]) => rawHeader.findIndex(h => keywords.some(k => h.includes(k)))
      const nameIdx = findIdx(['task', 'tugas', 'nama', 'name', 'title'])
      const picIdx = findIdx(['pic', 'assignee', 'owner', 'anggota', 'person', 'who'])
      const startIdx = findIdx(['start', 'mulai', 'tanggal', 'date', 'begin'])
      const durIdx = findIdx(['duration', 'durasi', 'lama', 'days', 'hari'])
      const depIdx = findIdx(['depend', 'relasi', 'predecessor', 'after', 'setelah'])

      if (nameIdx !== -1 && cells[nameIdx]) name = cells[nameIdx]
      if (picIdx !== -1 && cells[picIdx]) assignee = cells[picIdx]
      if (startIdx !== -1 && cells[startIdx]) start = cells[startIdx]
      if (durIdx !== -1 && cells[durIdx]) duration = cells[durIdx]
      if (depIdx !== -1 && cells[depIdx]) dependsOn = cells[depIdx]
    }

    if (/^\d+$/.test(duration.trim())) {
      duration = `${duration.trim()} hari`
    }

    rows.push({
      id: createRowId(),
      name,
      assignee,
      start,
      duration,
      end: '',
      dependsOn,
    })
  })

  return rows
}
