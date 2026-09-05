// Date grammar parser — supports explicit dates and relative dates

const MONTHS: Record<string, number> = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8,
  'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  // Indonesian
  'januari': 1, 'februari': 2, 'maret': 3, 'mei': 5, 'juni': 6, 'juli': 7,
  'agustus': 8, 'oktober': 10, 'nopember': 11, 'desember': 12,
}

const DAY_NAMES: Record<string, number> = {
  'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6,
  'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, 'sabtu': 6,
}

const RELATIVE_DAY_OFFSETS: Record<string, number> = {
  'besok': 1, 'lusa': 2, 'kemarin': -1, 'today': 0, 'tomorrow': 1, 'yesterday': -1,
}

export interface ParsedDate {
  ok: true
  value: Date
}

export interface DateError {
  ok: false
  error: string
}

export type DateResult = ParsedDate | DateError

export function parseDate(raw: string, referenceDate: string): DateResult {
  const s = raw.trim().toLowerCase()

  // ISO date
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3])
    if (!isNaN(d.getTime())) return { ok: true, value: d }
  }

  // dd/mm/yyyy or mm/dd/yyyy
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (slash) {
    const d = new Date(+slash[3], +slash[2] - 1, +slash[1])
    if (!isNaN(d.getTime())) return { ok: true, value: d }
  }

  // dd Month yyyy or dd Month yyyy (e.g. "10 September 2026")
  const named = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/.exec(s)
  if (named) {
    const month = MONTHS[named[2]]
    if (month) {
      const d = new Date(+named[3], month - 1, +named[1])
      if (!isNaN(d.getTime())) return { ok: true, value: d }
    }
  }

  // dd Month (no year — use reference year)
  const namedNoYear = /^(\d{1,2})\s+([a-z]+)$/.exec(s)
  if (namedNoYear) {
    const month = MONTHS[namedNoYear[2]]
    if (month) {
      const ref = new Date(referenceDate)
      let d = new Date(ref.getFullYear(), month - 1, +namedNoYear[1])
      if (d.getTime() < ref.getTime()) d.setFullYear(d.getFullYear() + 1)
      if (!isNaN(d.getTime())) return { ok: true, value: d }
    }
  }

  // Relative day words
  if (s in RELATIVE_DAY_OFFSETS) {
    const ref = new Date(referenceDate)
    ref.setDate(ref.getDate() + RELATIVE_DAY_OFFSETS[s])
    return { ok: true, value: ref }
  }

  // "Senin depan" / "next Monday" — find next occurrence of day
  const nextDay = /^(next\s+)?([a-z]+)\s+(depan|next)?$/i.exec(raw.trim())
  if (nextDay) {
    const dayName = nextDay[2].toLowerCase()
    const targetDow = DAY_NAMES[dayName]
    if (targetDow !== undefined) {
      const ref = new Date(referenceDate)
      const currentDow = ref.getDay()
      let diff = targetDow - currentDow
      if (diff <= 0) diff += 7
      ref.setDate(ref.getDate() + diff)
      return { ok: true, value: ref }
    }
  }

  // "this Monday" — find current or next occurrence
  const thisDay = /^this\s+([a-z]+)$/i.exec(raw.trim())
  if (thisDay) {
    const targetDow = DAY_NAMES[thisDay[1].toLowerCase()]
    if (targetDow !== undefined) {
      const ref = new Date(referenceDate)
      const currentDow = ref.getDay()
      let diff = targetDow - currentDow
      if (diff < 0) diff += 7
      ref.setDate(ref.getDate() + diff)
      return { ok: true, value: ref }
    }
  }

  // "minggu depan" / "next week" — add 7 days
  if (s === 'minggu depan' || s === 'next week') {
    const ref = new Date(referenceDate)
    ref.setDate(ref.getDate() + 7)
    return { ok: true, value: ref }
  }

  return { ok: false, error: `Unrecognized date: "${raw}"` }
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}